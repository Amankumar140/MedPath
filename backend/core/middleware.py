import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from loguru import logger

class RequestProfilingMiddleware(BaseHTTPMiddleware):
    """Injects precise instrumentation monitoring execution latency performance profiles across endpoints"""
    async def dispatch(self, request: Request, call_next):
        start_time = time.perf_counter()
        
        # Capture routing metadata 
        path = request.url.path
        method = request.method
        
        logger.info(f"Incoming Route Execution: {method} {path}")
        
        try:
            response = await call_next(request)
            process_time = (time.perf_counter() - start_time) * 1000
            
            # Format custom diagnostic verification telemetry response headers
            response.headers["X-Process-Latency-MS"] = f"{process_time:.2f}"
            
            logger.info(f"Route Completed: {method} {path} | Status: {response.status_code} | Duration: {process_time:.2f}ms")
            return response
            
        except Exception as exc:
            process_time = (time.perf_counter() - start_time) * 1000
            logger.error(f"Uncaught Server Trace Exception on {method} {path} | Fatal Core Failure: {str(exc)} | After {process_time:.2f}ms")
            raise exc