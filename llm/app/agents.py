import time
import traceback
from typing import Dict, Any, List, Optional
from langchain_core.output_parsers import StrOutputParser
from app.config import settings
from app.schemas import ExtractedPatientContext, SufficiencyValidation, BrowserLocation
from app.prompts.context_extraction import extraction_prompt
from app.prompts.validation import validation_prompt
from app.prompts.followup import followup_prompt
from app.tools import merge_patient_contexts
from app.logging_config import logger

def get_llm(temperature: float = 0.1):
    if settings.GROQ_API_KEY:
        try:
            from langchain_groq import ChatGroq
            return ChatGroq(
                groq_api_key=settings.GROQ_API_KEY,
                model_name="llama-3.3-70b-versatile",
                temperature=temperature,
                timeout=15,
                max_retries=2
            )
        except Exception as e:
            logger.warning(f"Failed to initialize Groq LLM: {e}. Falling back to Mistral.")

    if settings.MISTRAL_API_KEY:
        from langchain_mistralai import ChatMistralAI
        return ChatMistralAI(
            mistral_api_key=settings.MISTRAL_API_KEY,
            model="mistral-small-latest",
            temperature=temperature,
            timeout=30,
            max_retries=2
        )

    raise ValueError("Neither GROQ_API_KEY nor MISTRAL_API_KEY environment variables are configured.")

class LLMAgents:
    def __init__(self):
        pass

    async def extract_context(
        self,
        conversation_id: str,
        message: str,
        chat_history: List[Dict[str, str]],
        existing_context: Dict[str, Any]
    ) -> ExtractedPatientContext:
        start_time = time.time()
        llm = get_llm(temperature=0.0)
        structured_llm = llm.with_structured_output(ExtractedPatientContext)
        chain = extraction_prompt | structured_llm

        try:
            result: ExtractedPatientContext = await chain.ainvoke({
                "message": message,
                "chat_history": str(chat_history),
                "existing_context": str(existing_context)
            })
            duration_ms = round((time.time() - start_time) * 1000, 2)
            logger.info(
                f"Context extraction completed for conversation_id={conversation_id}",
                extra={
                    "conversation_id": conversation_id,
                    "llm_latency_ms": duration_ms,
                }
            )
            return result
        except Exception as e:
            tb = traceback.format_exc()
            logger.error(
                f"LLM Context Extraction failed for conversation_id={conversation_id}: {type(e).__name__}: {str(e)}\n{tb}",
                extra={"conversation_id": conversation_id}
            )
            raise RuntimeError(f"LLM Service Unavailable: {type(e).__name__}: {str(e)}") from e

    async def validate_sufficiency(
        self,
        conversation_id: str,
        extracted_context: Dict[str, Any]
    ) -> SufficiencyValidation:
        start_time = time.time()
        llm = get_llm(temperature=0.0)
        structured_llm = llm.with_structured_output(SufficiencyValidation)
        chain = validation_prompt | structured_llm

        try:
            result: SufficiencyValidation = await chain.ainvoke({
                "extracted_context": str(extracted_context)
            })
            duration_ms = round((time.time() - start_time) * 1000, 2)
            logger.info(
                f"Sufficiency validation completed: is_sufficient={result.is_sufficient} for conversation_id={conversation_id}",
                extra={
                    "conversation_id": conversation_id,
                    "llm_latency_ms": duration_ms
                }
            )
            return result
        except Exception as e:
            tb = traceback.format_exc()
            logger.error(
                f"LLM Sufficiency Validation failed for conversation_id={conversation_id}: {type(e).__name__}: {str(e)}\n{tb}",
                extra={"conversation_id": conversation_id}
            )
            raise RuntimeError(f"LLM Service Unavailable: {type(e).__name__}: {str(e)}") from e

    async def generate_followup(
        self,
        conversation_id: str,
        message: str,
        chat_history: List[Dict[str, str]],
        extracted_context: Dict[str, Any],
        missing_fields: List[str],
        primary_missing_field: Optional[str] = None
    ) -> str:
        start_time = time.time()
        llm = get_llm(temperature=0.3)
        chain = followup_prompt | llm | StrOutputParser()

        primary_field = primary_missing_field or (missing_fields[0] if missing_fields else "more details on symptoms")

        try:
            question: str = await chain.ainvoke({
                "message": message,
                "chat_history": str(chat_history),
                "extracted_context": str(extracted_context),
                "missing_fields": ", ".join(missing_fields) if missing_fields else primary_field,
                "primary_missing_field": primary_field
            })
            duration_ms = round((time.time() - start_time) * 1000, 2)
            logger.info(
                f"Follow-up generation completed for conversation_id={conversation_id}",
                extra={
                    "conversation_id": conversation_id,
                    "llm_latency_ms": duration_ms
                }
            )
            return question.strip()
        except Exception as e:
            tb = traceback.format_exc()
            logger.error(
                f"LLM Follow-up Generation failed for conversation_id={conversation_id}: {type(e).__name__}: {str(e)}\n{tb}",
                extra={"conversation_id": conversation_id}
            )
            raise RuntimeError(f"LLM Service Unavailable: {type(e).__name__}: {str(e)}") from e

agents = LLMAgents()
