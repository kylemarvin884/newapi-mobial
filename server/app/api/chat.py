import time
from typing import Any

import httpx
from fastapi import APIRouter, Depends

from app.core.errors import UpstreamError
from app.dependencies import AuthContext, get_auth_context, get_newapi, get_session_store
from app.schemas import (
    ChatRequest,
    ChatResponse,
    GeneratedImage,
    ImageGenerationRequest,
    ImageGenerationResponse,
    ModelGroupInfo,
    ModelInfo,
)
from app.services.newapi import NewApiClient
from app.services.session_store import SessionStore


router = APIRouter(prefix="/chat", tags=["chat"])


async def _used_quota(newapi: NewApiClient, auth: AuthContext) -> int | None:
    try:
        user = await newapi.get_self(auth.session)
    except (UpstreamError, httpx.RequestError):
        return None
    value = user.get("used_quota")
    return int(value) if isinstance(value, (int, float)) else None


def _total_tokens(usage: Any) -> int:
    if not isinstance(usage, dict):
        return 0
    total = usage.get("total_tokens")
    if isinstance(total, (int, float)):
        return max(0, int(total))
    input_tokens = usage.get("input_tokens", usage.get("prompt_tokens", 0))
    output_tokens = usage.get("output_tokens", usage.get("completion_tokens", 0))
    return max(0, int(input_tokens or 0) + int(output_tokens or 0))


@router.get("/models", response_model=list[ModelInfo])
async def list_models(
    auth: AuthContext = Depends(get_auth_context),
    newapi: NewApiClient = Depends(get_newapi),
) -> list[ModelInfo]:
    models = await newapi.list_models(auth.session)
    return [ModelInfo.model_validate(model) for model in models]


@router.get("/model-groups", response_model=list[ModelGroupInfo])
async def list_model_groups(
    auth: AuthContext = Depends(get_auth_context),
    newapi: NewApiClient = Depends(get_newapi),
) -> list[ModelGroupInfo]:
    groups = await newapi.list_model_groups(auth.session)
    return [ModelGroupInfo.model_validate(group) for group in groups]


@router.post("/completions", response_model=ChatResponse)
async def create_completion(
    request: ChatRequest,
    auth: AuthContext = Depends(get_auth_context),
    newapi: NewApiClient = Depends(get_newapi),
    store: SessionStore = Depends(get_session_store),
) -> ChatResponse:
    key = await newapi.reveal_token(auth.session, request.token_id)
    if not key.startswith("sk-"):
        key = f"sk-{key}"
    quota_before = await _used_quota(newapi, auth)
    started_at = time.perf_counter()
    completion = await newapi.chat(key, request)
    duration_ms = round((time.perf_counter() - started_at) * 1000)
    quota_after = await _used_quota(newapi, auth)
    usage = completion.get("usage")
    await store.add_used_tokens(auth.session.user_id, _total_tokens(usage))
    choice = completion.get("choices", [{}])[0]
    message = choice.get("message", {})
    content = message.get("content", "")
    if isinstance(content, list):
        content = "\n".join(part.get("text", "") for part in content if isinstance(part, dict))
    return ChatResponse(
        id=completion.get("id", ""),
        model=completion.get("model", request.model),
        content=content,
        finish_reason=choice.get("finish_reason"),
        usage=usage,
        quota_used=max(0, quota_after - quota_before)
        if quota_before is not None and quota_after is not None
        else 0,
        duration_ms=duration_ms,
    )


@router.post("/images", response_model=ImageGenerationResponse)
async def create_image(
    request: ImageGenerationRequest,
    auth: AuthContext = Depends(get_auth_context),
    newapi: NewApiClient = Depends(get_newapi),
    store: SessionStore = Depends(get_session_store),
) -> ImageGenerationResponse:
    key = await newapi.reveal_token(auth.session, request.token_id)
    if not key.startswith("sk-"):
        key = f"sk-{key}"
    quota_before = await _used_quota(newapi, auth)
    started_at = time.perf_counter()
    generation = await newapi.generate_image(key, request)
    duration_ms = round((time.perf_counter() - started_at) * 1000)
    quota_after = await _used_quota(newapi, auth)
    usage = generation.get("usage")
    await store.add_used_tokens(auth.session.user_id, _total_tokens(usage))
    images = [
        GeneratedImage(
            url=str(item.get("url") or ""),
            b64_json=str(item.get("b64_json") or ""),
            revised_prompt=str(item.get("revised_prompt") or ""),
        )
        for item in generation.get("data", [])
        if isinstance(item, dict)
    ]
    return ImageGenerationResponse(
        created=int(generation.get("created") or 0),
        model=str(generation.get("model") or request.model),
        images=images,
        usage=usage,
        quota_used=max(0, quota_after - quota_before)
        if quota_before is not None and quota_after is not None
        else 0,
        duration_ms=duration_ms,
    )
