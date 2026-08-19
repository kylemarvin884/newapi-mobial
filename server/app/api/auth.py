from fastapi import APIRouter, Depends, status

from app.core.errors import UpstreamError, unauthorized
from app.dependencies import AuthContext, get_auth_context, get_newapi, get_session_store
from app.schemas import (
    AuthResponse,
    EmailVerificationRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    TwoFactorRequest,
    UserProfile,
)
from app.services.newapi import NewApiClient, build_upstream_session
from app.services.session_store import SessionStore


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/verification", response_model=MessageResponse)
async def send_email_verification(
    request: EmailVerificationRequest,
    newapi: NewApiClient = Depends(get_newapi),
) -> MessageResponse:
    await newapi.send_email_verification(request.email)
    return MessageResponse(message="验证码已发送")


@router.post("/register", response_model=MessageResponse)
async def register(
    request: RegisterRequest,
    newapi: NewApiClient = Depends(get_newapi),
) -> MessageResponse:
    await newapi.register(
        request.username.strip(),
        request.password,
        request.email,
        request.verification_code.strip(),
    )
    return MessageResponse(message="注册成功")


@router.post("/login", response_model=AuthResponse)
async def login(
    request: LoginRequest,
    newapi: NewApiClient = Depends(get_newapi),
    store: SessionStore = Depends(get_session_store),
) -> AuthResponse:
    payload, set_cookie = await newapi.login(request.username, request.password)
    data = payload.get("data", {})
    if data.get("require_2fa"):
        flow_token = str(data.get("flow_token") or "")
        if not flow_token and not set_cookie:
            raise UpstreamError("NewAPI 两步验证响应缺少会话信息")
        challenge_token = await store.create_pending_login(
            flow_token, set_cookie
        )
        return AuthResponse(
            requires_two_factor=True,
            challenge_token=challenge_token,
        )
    upstream = build_upstream_session(payload, set_cookie)
    token = await store.create(upstream)
    return AuthResponse(access_token=token, user=UserProfile.model_validate(upstream.user))


@router.post("/two-factor", response_model=AuthResponse)
async def verify_two_factor(
    request: TwoFactorRequest,
    newapi: NewApiClient = Depends(get_newapi),
    store: SessionStore = Depends(get_session_store),
) -> AuthResponse:
    pending = await store.get_pending_login(request.challenge_token)
    if pending is None:
        raise unauthorized("两步验证会话已过期，请重新登录")
    payload, set_cookie = await newapi.verify_two_factor(
        pending.flow_token, request.code, pending.cookie
    )
    upstream = build_upstream_session(payload, set_cookie)
    token = await store.create(upstream)
    await store.delete_pending_login(request.challenge_token)
    return AuthResponse(access_token=token, user=UserProfile.model_validate(upstream.user))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    auth: AuthContext = Depends(get_auth_context),
    newapi: NewApiClient = Depends(get_newapi),
    store: SessionStore = Depends(get_session_store),
) -> None:
    try:
        await newapi.logout(auth.session)
    finally:
        await store.delete(auth.token)
