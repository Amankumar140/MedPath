import logging
import json
import sys
from datetime import datetime
from app.config import settings

class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_object = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
            "prompt_version": settings.PROMPT_VERSION,
        }
        if hasattr(record, "conversation_id"):
            log_object["conversation_id"] = getattr(record, "conversation_id")
        if hasattr(record, "latency_ms"):
            log_object["latency_ms"] = getattr(record, "latency_ms")
        if hasattr(record, "llm_latency_ms"):
            log_object["llm_latency_ms"] = getattr(record, "llm_latency_ms")
        if hasattr(record, "tokens"):
            log_object["tokens"] = getattr(record, "tokens")
        if hasattr(record, "redis_hit"):
            log_object["redis_hit"] = getattr(record, "redis_hit")
        if hasattr(record, "redis_miss"):
            log_object["redis_miss"] = getattr(record, "redis_miss")

        return json.dumps(log_object)

def setup_logging():
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())
    
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))
    root_logger.handlers = [handler]

setup_logging()
logger = logging.getLogger("llm_service")
