import pytest

from app.core.security import SecretBox, pending_login_key
from app.services.session_store import SessionStore, UpstreamSession


class MemoryStore:
    def __init__(self) -> None:
        self.values: dict[str, str] = {}
        self.ttls: dict[str, int] = {}

    async def setex(self, name: str, time: int, value: str) -> None:
        self.values[name] = value
        self.ttls[name] = time

    async def get(self, name: str) -> str | None:
        return self.values.get(name)

    async def delete(self, *names: str) -> None:
        for name in names:
            self.values.pop(name, None)
            self.ttls.pop(name, None)

    async def incrby(self, name: str, amount: int) -> int:
        value = int(self.values.get(name, "0")) + amount
        self.values[name] = str(value)
        return value


@pytest.mark.asyncio
async def test_pending_login_is_encrypted_and_short_lived() -> None:
    redis = MemoryStore()
    store = SessionStore(redis, SecretBox("a" * 32), 30 * 24 * 60 * 60)
    challenge = await store.create_pending_login("", "session=opaque")
    key = pending_login_key(challenge)

    assert "session=opaque" not in redis.values[key]
    assert redis.ttls[key] == 5 * 60
    pending = await store.get_pending_login(challenge)
    assert pending is not None
    assert pending.cookie == "session=opaque"

    await store.delete_pending_login(challenge)
    assert await store.get_pending_login(challenge) is None


@pytest.mark.asyncio
async def test_usage_keys_use_custom_namespace() -> None:
    redis = MemoryStore()
    store = SessionStore(redis, SecretBox("a" * 32), 60, "acme-ai")
    assert await store.add_used_tokens(7, 42) == 42
    assert await store.get_used_tokens(7) == 42
    assert "acme-ai:usage:7:tokens" in redis.values


def test_cookie_session_does_not_require_token_refresh() -> None:
    session = UpstreamSession(
        user_id=7,
        access_token="",
        access_expires_at=0,
        refresh_cookie="session=opaque",
        session_id="",
        user={"id": 7},
        auth_mode="cookie",
    )
    assert SessionStore.needs_refresh(session) is False
