from fastapi import APIRouter, Depends, Response, status

from app.core.errors import UpstreamError
from app.dependencies import AuthContext, get_auth_context, get_newapi
from app.schemas import ApiKey, ApiKeyCreate, ApiKeyReveal, ApiKeyUpdate, GroupInfo
from app.services.newapi import NewApiClient


router = APIRouter(prefix="/keys", tags=["keys"])


def normalize_token(token: dict) -> ApiKey:
    allow_ips = token.get("allow_ips") or ""
    return ApiKey(
        id=token["id"],
        name=token.get("name", ""),
        key_masked=token.get("key_masked") or token.get("key", ""),
        status=token.get("status", 1),
        created_time=token.get("created_time", 0),
        accessed_time=token.get("accessed_time", 0),
        expired_time=token.get("expired_time", -1),
        remain_quota=token.get("remain_quota", 0),
        used_quota=token.get("used_quota", 0),
        unlimited_quota=token.get("unlimited_quota", True),
        model_limits_enabled=token.get("model_limits_enabled", False),
        model_limits=token.get("model_limits", ""),
        allow_ips=allow_ips if isinstance(allow_ips, str) else "",
        group=token.get("group", ""),
    )


@router.get("/groups", response_model=list[GroupInfo])
async def list_groups(
    auth: AuthContext = Depends(get_auth_context),
    newapi: NewApiClient = Depends(get_newapi),
) -> list[GroupInfo]:
    groups = await newapi.list_groups(auth.session)
    return [GroupInfo.model_validate(group) for group in groups]


@router.get("", response_model=list[ApiKey])
async def list_keys(
    auth: AuthContext = Depends(get_auth_context),
    newapi: NewApiClient = Depends(get_newapi),
) -> list[ApiKey]:
    tokens = await newapi.list_tokens(auth.session)
    return [normalize_token(token) for token in tokens]


@router.post("", response_model=ApiKey, status_code=status.HTTP_201_CREATED)
async def create_key(
    request: ApiKeyCreate,
    auth: AuthContext = Depends(get_auth_context),
    newapi: NewApiClient = Depends(get_newapi),
) -> ApiKey:
    existing_ids = {token["id"] for token in await newapi.list_tokens(auth.session)}
    await newapi.create_token(auth.session, request)
    tokens = await newapi.list_tokens(auth.session)
    created = next((token for token in tokens if token.get("id") not in existing_ids), None)
    if created is None:
        if not tokens:
            raise UpstreamError("密钥已创建，但暂时无法读取", 502)
        created = tokens[0]
    return normalize_token(created)


@router.put("/{token_id}", response_model=ApiKey)
async def update_key(
    token_id: int,
    request: ApiKeyUpdate,
    auth: AuthContext = Depends(get_auth_context),
    newapi: NewApiClient = Depends(get_newapi),
) -> ApiKey:
    token = await newapi.update_token(auth.session, token_id, request)
    return normalize_token(token)


@router.post("/{token_id}/toggle", response_model=ApiKey)
async def toggle_key(
    token_id: int,
    auth: AuthContext = Depends(get_auth_context),
    newapi: NewApiClient = Depends(get_newapi),
) -> ApiKey:
    current = await newapi.get_token(auth.session, token_id)
    next_status = 2 if current.get("status") == 1 else 1
    token = await newapi.set_token_status(auth.session, token_id, next_status)
    return normalize_token(token)


@router.post("/{token_id}/reveal", response_model=ApiKeyReveal)
async def reveal_key(
    token_id: int,
    auth: AuthContext = Depends(get_auth_context),
    newapi: NewApiClient = Depends(get_newapi),
) -> ApiKeyReveal:
    key = await newapi.reveal_token(auth.session, token_id)
    return ApiKeyReveal(key=f"sk-{key}" if not key.startswith("sk-") else key)


@router.delete("/{token_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_key(
    token_id: int,
    auth: AuthContext = Depends(get_auth_context),
    newapi: NewApiClient = Depends(get_newapi),
) -> Response:
    await newapi.delete_token(auth.session, token_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
