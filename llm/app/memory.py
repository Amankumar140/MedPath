import json
from datetime import datetime
from typing import Optional, Dict, Any
import redis.asyncio as redis
from app.config import settings
from app.logging_config import logger
from app.schemas import ConversationState

class RedisMemoryManager:
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self._fallback_memory: Dict[str, dict] = {}
        self._use_fallback: bool = False

    async def connect(self):
        if not self.redis_client:
            try:
                if settings.REDIS_URL:
                    # Use REDIS_URL (supports rediss:// for TLS like Upstash)
                    self.redis_client = redis.from_url(
                        settings.REDIS_URL,
                        decode_responses=True,
                        socket_connect_timeout=5.0,
                        socket_timeout=5.0
                    )
                    logger.info(f"Connecting to Redis via REDIS_URL...")
                else:
                    # Fallback to host/port config
                    self.redis_client = redis.Redis(
                        host=settings.REDIS_HOST,
                        port=settings.REDIS_PORT,
                        db=settings.REDIS_DB,
                        password=settings.REDIS_PASSWORD if settings.REDIS_PASSWORD else None,
                        decode_responses=True,
                        socket_connect_timeout=2.0,
                        socket_timeout=2.0
                    )
                    logger.info(f"Connecting to Redis via host={settings.REDIS_HOST}:{settings.REDIS_PORT}...")

                await self.redis_client.ping()
                self._use_fallback = False
                logger.info("Connected to Redis successfully")
            except Exception as e:
                self._use_fallback = True
                logger.warning(
                    f"Redis unavailable. Using local in-memory fallback: {str(e)}"
                )

    async def close(self):
        if self.redis_client:
            try:
                await self.redis_client.close()
            except Exception:
                pass
            self.redis_client = None

    def _get_key(self, conversation_id: str) -> str:
        return f"llm:conversation:{conversation_id}"

    async def get_conversation(self, conversation_id: str) -> ConversationState:
        key = self._get_key(conversation_id)
        
        if self._use_fallback:
            if key in self._fallback_memory:
                logger.info(
                    f"Fallback Memory HIT for conversation_id={conversation_id}",
                    extra={"conversation_id": conversation_id, "redis_hit": False, "redis_miss": True}
                )
                return ConversationState(**self._fallback_memory[key])
            else:
                return ConversationState(
                    conversation_id=conversation_id,
                    chat_history=[],
                    structured_context={},
                    missing_fields=[]
                )

        try:
            if not self.redis_client:
                await self.connect()

            if self._use_fallback:
                return await self.get_conversation(conversation_id)

            data_str = await self.redis_client.get(key)
            if data_str:
                logger.info(
                    f"Redis HIT for conversation_id={conversation_id}",
                    extra={"conversation_id": conversation_id, "redis_hit": True, "redis_miss": False}
                )
                data_dict = json.loads(data_str)
                return ConversationState(**data_dict)
            else:
                logger.info(
                    f"Redis MISS for conversation_id={conversation_id}",
                    extra={"conversation_id": conversation_id, "redis_hit": False, "redis_miss": True}
                )
                return ConversationState(
                    conversation_id=conversation_id,
                    chat_history=[],
                    structured_context={},
                    missing_fields=[]
                )
        except Exception as e:
            logger.warning(f"Redis get_conversation failure, switching to fallback memory: {str(e)}", extra={"conversation_id": conversation_id})
            self._use_fallback = True
            return await self.get_conversation(conversation_id)

    async def save_conversation(
        self,
        conversation_id: str,
        chat_history: list,
        structured_context: dict,
        missing_fields: list,
        ttl_seconds: int = 1800
    ) -> None:
        key = self._get_key(conversation_id)
        state = ConversationState(
            conversation_id=conversation_id,
            chat_history=chat_history,
            structured_context=structured_context,
            missing_fields=missing_fields,
            last_updated=datetime.utcnow().isoformat() + "Z"
        )
        state_dict = state.model_dump()

        if self._use_fallback:
            self._fallback_memory[key] = state_dict
            logger.info(
                f"Saved conversation state to local fallback memory for conversation_id={conversation_id}",
                extra={"conversation_id": conversation_id}
            )
            return

        try:
            if not self.redis_client:
                await self.connect()

            if self._use_fallback:
                self._fallback_memory[key] = state_dict
                return

            serialized = json.dumps(state_dict)
            await self.redis_client.setex(key, ttl_seconds, serialized)
            logger.info(
                f"Saved conversation state to Redis for conversation_id={conversation_id} with TTL={ttl_seconds}s",
                extra={"conversation_id": conversation_id}
            )
        except Exception as e:
            logger.warning(f"Redis save_conversation failure, storing in fallback memory: {str(e)}", extra={"conversation_id": conversation_id})
            self._use_fallback = True
            self._fallback_memory[key] = state_dict

memory_manager = RedisMemoryManager()
