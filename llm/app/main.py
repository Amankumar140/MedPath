import time
from contextlib import asynccontextmanager
from typing import Union
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse

from app.config import settings
from app.logging_config import logger
from app.memory import memory_manager
from app.schemas import (
    ContextRequest,
    ContextFollowUpResponse,
    ContextCompleteResponse,
)
from app.tools import merge_patient_contexts
from app.agents import agents

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting MedPath LLM Context Extraction Microservice...")
    try:
        await memory_manager.connect()
    except Exception as e:
        logger.warning(f"Initial Redis connection deferred: {str(e)}")
    yield
    logger.info("Shutting down MedPath LLM Service...")
    await memory_manager.close()

app = FastAPI(
    title="MedPath LLM Context Extraction Service",
    version="1.0.0",
    description="Microservice responsible for conversational context extraction, memory management, and follow-up generation.",
    lifespan=lifespan
)

@app.get("/health", summary="Health Check")
async def health_check():
    redis_status = "DOWN"
    try:
        if memory_manager.redis_client:
            await memory_manager.redis_client.ping()
            redis_status = "UP"
    except Exception:
        redis_status = "DOWN"

    return {
        "status": "UP",
        "service": "MedPath LLM Microservice",
        "version": settings.PROMPT_VERSION,
        "redis": redis_status
    }

@app.post(
    "/context",
    response_model=Union[ContextFollowUpResponse, ContextCompleteResponse],
    summary="Process User Context & Manage Conversation State"
)
async def process_context(req: ContextRequest):
    start_time = time.time()
    conversation_id = req.conversation_id
    user_message = req.message.strip()

    if not conversation_id or not user_message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="conversation_id and message fields are required."
        )

    # 1. Retrieve memory state from Redis (500 Error if Redis fails)
    try:
        state = await memory_manager.get_conversation(conversation_id)
    except Exception as e:
        logger.error(f"Redis state retrieval failed: {str(e)}", extra={"conversation_id": conversation_id})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Redis Memory Storage Error: {str(e)}"
        )

    # 2. Append User Message to local chat history copy
    current_chat_history = list(state.chat_history)
    current_chat_history.append({"role": "user", "content": user_message})

    # 3. Context Extraction via Mistral (503 Error if Mistral fails, Redis uncorrupted)
    try:
        extracted = await agents.extract_context(
            conversation_id=conversation_id,
            message=user_message,
            chat_history=current_chat_history,
            existing_context=state.structured_context
        )
    except Exception as e:
        logger.error(f"Context extraction LLM failure: {str(e)}", extra={"conversation_id": conversation_id})
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Mistral LLM Service Unavailable: {str(e)}"
        )

    # 4. Merge Extracted Context with Existing Context & Browser Location
    merged_context = merge_patient_contexts(
        existing=state.structured_context,
        newly_extracted=extracted,
        browser_location=req.browser_location
    )

    # 5. Context Sufficiency Validation via Mistral
    try:
        validation = await agents.validate_sufficiency(
            conversation_id=conversation_id,
            extracted_context=merged_context
        )
    except Exception as e:
        logger.error(f"Validation LLM failure: {str(e)}", extra={"conversation_id": conversation_id})
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Mistral LLM Service Unavailable: {str(e)}"
        )

    total_latency_ms = round((time.time() - start_time) * 1000, 2)

    # 6. Branching Logic: Insufficient Context -> FOLLOW_UP
    if not validation.is_sufficient:
        try:
            followup_question = await agents.generate_followup(
                conversation_id=conversation_id,
                message=user_message,
                chat_history=current_chat_history,
                extracted_context=merged_context,
                missing_fields=validation.missing_fields,
                primary_missing_field=validation.primary_missing_field
            )
        except Exception as e:
            logger.error(f"Follow-up generation LLM failure: {str(e)}", extra={"conversation_id": conversation_id})
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Mistral LLM Service Unavailable: {str(e)}"
            )

        current_chat_history.append({"role": "assistant", "content": followup_question})

        # Save state to Redis only after successful LLM processing
        try:
            await memory_manager.save_conversation(
                conversation_id=conversation_id,
                chat_history=current_chat_history,
                structured_context=merged_context,
                missing_fields=validation.missing_fields
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Redis Memory Save Error: {str(e)}"
            )

        logger.info(
            f"Returned FOLLOW_UP response for conversation_id={conversation_id}",
            extra={"conversation_id": conversation_id, "latency_ms": total_latency_ms}
        )

        return ContextFollowUpResponse(
            status="FOLLOW_UP",
            question=followup_question,
            missing_fields=validation.missing_fields,
            extracted_context=merged_context
        )

    # 7. Branching Logic: Sufficient Context -> COMPLETE
    current_chat_history.append({"role": "assistant", "content": "Context complete. Proceeding to hospital discovery."})

    try:
        await memory_manager.save_conversation(
            conversation_id=conversation_id,
            chat_history=current_chat_history,
            structured_context=merged_context,
            missing_fields=[]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Redis Memory Save Error: {str(e)}"
        )

    logger.info(
        f"Returned COMPLETE response for conversation_id={conversation_id}",
        extra={"conversation_id": conversation_id, "latency_ms": total_latency_ms}
    )

    return ContextCompleteResponse(
        status="COMPLETE",
        context=merged_context
    )
