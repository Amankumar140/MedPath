import sys
import logging
from loguru import logger
from app.core.config import settings

def setup_structured_logging():
    # Remove standard framework interceptors
    logging.getLogger("uvicorn.access").handlers = []
    logging.getLogger("uvicorn").handlers = []
    
    # Configure Loguru output formats
    log_format = (
        "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
        "<level>{message}</level>"
    )
    
    logger.remove()
    logger.add(
        sys.stdout,
        format=log_format,
        level="DEBUG" if settings.ENVIRONMENT == "development" else "INFO",
        colorize=True
    )
    
    # Push back unified handling into python native standard logger channels
    class InterceptHandler(logging.Handler):
        def emit(self, record):
            try:
                level = logger.level(record.levelname).name
            except ValueError:
                level = record.levelno

            frame = logging.currentframe()
            depth = 2
            while frame.f_code.co_filename == logging.__file__:
                frame = frame.f_back
                depth += 1

            logger.opt(depth=depth, exception=record.exc_info).log(level, record.getMessage())

    logging.basicConfig(handlers=[InterceptHandler()], level=0, force=True)