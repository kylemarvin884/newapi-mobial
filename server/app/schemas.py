from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)


class EmailVerificationRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if "@" not in normalized or normalized.startswith("@") or normalized.endswith("@"):
            raise ValueError("请输入有效的邮箱地址")
        return normalized


class RegisterRequest(EmailVerificationRequest):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=8, max_length=128)
    verification_code: str = Field(min_length=4, max_length=16)


class TwoFactorRequest(BaseModel):
    challenge_token: str = Field(min_length=16)
    code: str = Field(min_length=6, max_length=32)


class UserProfile(BaseModel):
    id: int
    username: str
    display_name: str = ""
    email: str = ""
    group: str = ""
    quota: int = 0
    used_quota: int = 0
    request_count: int = 0


class AuthResponse(BaseModel):
    access_token: str | None = None
    token_type: Literal["bearer"] = "bearer"
    requires_two_factor: bool = False
    challenge_token: str | None = None
    user: UserProfile | None = None


class MessageResponse(BaseModel):
    message: str


class BalanceResponse(BaseModel):
    currency_symbol: str
    quota_per_unit: int
    available: float
    used: float
    available_quota: int
    used_quota: int
    request_count: int
    used_tokens: int = 0


class ApiKey(BaseModel):
    id: int
    name: str
    key_masked: str = ""
    status: int = 1
    created_time: int = 0
    accessed_time: int = 0
    expired_time: int = -1
    remain_quota: int = 0
    used_quota: int = 0
    unlimited_quota: bool = True
    model_limits_enabled: bool = False
    model_limits: str = ""
    allow_ips: str = ""
    group: str = ""


class ApiKeyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    expired_time: int = -1
    remain_quota: int = Field(default=0, ge=0)
    unlimited_quota: bool = True
    model_limits: list[str] = Field(default_factory=list)
    allow_ips: list[str] = Field(default_factory=list)
    group: str = Field(default="default", min_length=1, max_length=64)


class ApiKeyUpdate(ApiKeyCreate):
    status: int = Field(default=1, ge=1, le=3)


class ApiKeyReveal(BaseModel):
    key: str


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str = Field(min_length=1, max_length=100_000)


class ChatRequest(BaseModel):
    token_id: int
    model: str = Field(min_length=1, max_length=128)
    messages: list[ChatMessage] = Field(min_length=1, max_length=100)
    temperature: float | None = Field(default=None, ge=0, le=2)
    max_tokens: int | None = Field(default=None, ge=1, le=131_072)

    @field_validator("messages")
    @classmethod
    def require_user_message(cls, value: list[ChatMessage]) -> list[ChatMessage]:
        if not any(message.role == "user" for message in value):
            raise ValueError("至少需要一条用户消息")
        return value


class ChatResponse(BaseModel):
    id: str
    model: str
    content: str
    finish_reason: str | None = None
    usage: dict[str, Any] | None = None
    quota_used: int = 0
    duration_ms: int = 0


class ImageGenerationRequest(BaseModel):
    token_id: int
    model: str = Field(min_length=1, max_length=128)
    prompt: str = Field(min_length=1, max_length=100_000)
    n: int = Field(default=1, ge=1, le=4)
    size: str = Field(default="1024x1024", min_length=3, max_length=32)
    quality: str = Field(default="standard", min_length=1, max_length=32)


class GeneratedImage(BaseModel):
    url: str = ""
    b64_json: str = ""
    revised_prompt: str = ""


class ImageGenerationResponse(BaseModel):
    created: int = 0
    model: str
    images: list[GeneratedImage]
    usage: dict[str, Any] | None = None
    quota_used: int = 0
    duration_ms: int = 0


class ModelInfo(BaseModel):
    id: str
    owned_by: str = ""


class GroupInfo(BaseModel):
    id: str
    description: str = ""
    ratio: str = ""


class ModelGroupInfo(GroupInfo):
    models: list[str] = Field(default_factory=list)
