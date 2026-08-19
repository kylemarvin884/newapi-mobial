from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import account, auth, chat, keys
from app.core.config import get_settings
from app.core.errors import UpstreamError
from app.core.security import SecretBox
from app.services.newapi import NewApiClient
from app.services.session_store import SessionStore, build_redis


settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    redis = build_redis(settings.redis_url)
    app.state.redis = redis
    app.state.session_store = SessionStore(
        redis,
        SecretBox(settings.session_secret),
        settings.session_ttl_seconds,
        settings.redis_namespace,
    )
    app.state.newapi = NewApiClient(
        settings.newapi_base_url, settings.request_timeout_seconds
    )
    yield
    await redis.aclose()


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url=None,
    lifespan=lifespan,
)

if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )


@app.exception_handler(UpstreamError)
async def upstream_error_handler(_: Request, exc: UpstreamError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


@app.exception_handler(httpx.RequestError)
async def upstream_network_error_handler(_: Request, __: httpx.RequestError) -> JSONResponse:
    return JSONResponse(status_code=502, content={"detail": "暂时无法连接 AI 服务"})


@app.get("/health", tags=["system"])
async def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth.router, prefix="/api/v1")
app.include_router(account.router, prefix="/api/v1")
app.include_router(keys.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
