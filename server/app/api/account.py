from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings
from app.dependencies import AuthContext, get_auth_context, get_newapi, get_session_store
from app.schemas import BalanceResponse, UserProfile
from app.services.newapi import NewApiClient
from app.services.session_store import SessionStore


router = APIRouter(prefix="/account", tags=["account"])


@router.get("/me", response_model=UserProfile)
async def get_me(
    auth: AuthContext = Depends(get_auth_context),
    newapi: NewApiClient = Depends(get_newapi),
) -> UserProfile:
    user = await newapi.get_self(auth.session)
    return UserProfile.model_validate(user)


@router.get("/balance", response_model=BalanceResponse)
async def get_balance(
    auth: AuthContext = Depends(get_auth_context),
    newapi: NewApiClient = Depends(get_newapi),
    store: SessionStore = Depends(get_session_store),
    settings: Settings = Depends(get_settings),
) -> BalanceResponse:
    user = await newapi.get_self(auth.session)
    return BalanceResponse(
        currency_symbol=settings.currency_symbol,
        quota_per_unit=settings.quota_per_unit,
        available=round(user.get("quota", 0) / settings.quota_per_unit, 4),
        used=round(user.get("used_quota", 0) / settings.quota_per_unit, 4),
        available_quota=user.get("quota", 0),
        used_quota=user.get("used_quota", 0),
        request_count=user.get("request_count", 0),
        used_tokens=await store.get_used_tokens(auth.session.user_id),
    )
