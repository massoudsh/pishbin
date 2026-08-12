"""
FastAPI application entry point.
"""
import logging
import time
from collections import defaultdict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.core.config import settings
from app.api.router import api_router
from app.db.init_db import init_db
from app.core.exception_handlers import (
    http_exception_handler,
    validation_exception_handler,
    generic_exception_handler,
)

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

# In-memory rate limit: N requests per minute per client (by X-Forwarded-For or client.host)
RATE_LIMIT_REQUESTS = settings.RATE_LIMIT_REQUESTS
RATE_LIMIT_WINDOW_SEC = 60
_rate_limit_store: dict[str, list[float]] = defaultdict(list)


_RATE_CLEANUP_INTERVAL = 300  # clean stale IPs every 5 minutes
_last_cleanup = time.monotonic()


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        global _last_cleanup
        path = request.scope.get("path", "")
        if path in ("/", "/health", "/docs", "/openapi.json", "/redoc"):
            return await call_next(request)
        client = request.client
        key = request.headers.get("x-forwarded-for", client.host if client else "unknown").split(",")[0].strip()
        now = time.monotonic()
        window_start = now - RATE_LIMIT_WINDOW_SEC
        _rate_limit_store[key] = [t for t in _rate_limit_store[key] if t > window_start]
        if len(_rate_limit_store[key]) >= RATE_LIMIT_REQUESTS:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please try again later."},
            )
        _rate_limit_store[key].append(now)
        # Periodically evict IPs with no recent requests to prevent unbounded growth
        if now - _last_cleanup > _RATE_CLEANUP_INTERVAL:
            stale = [k for k, v in _rate_limit_store.items() if not v]
            for k in stale:
                del _rate_limit_store[k]
            _last_cleanup = now
        return await call_next(request)


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
)
# Rate limit API only (skip / and /health for load balancers)
app.add_middleware(RateLimitMiddleware)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handlers
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.on_event("startup")
def on_startup() -> None:
    """
    Application startup hook.

    In local/dev and docker-compose setups we optionally auto-create tables
    to avoid a separate init step.
    """
    if settings.AUTO_CREATE_DB:
        init_db()


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Pishbin API",
        "version": settings.APP_VERSION,
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

