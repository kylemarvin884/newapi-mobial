import json
import time
from contextlib import asynccontextmanager
from dataclasses import asdict, dataclass
from typing import Any, AsyncIterator, Protocol

from redis.asyncio import Redis

from app.core.security import (
    SecretBox,
    new_session_token,
    pending_login_key,
    session_key,
)


@dataclass
class UpstreamSession:
    user_id: int
    access_token: str
    access_expires_at: int
    refresh_cookie: str
    session_id: str
    user: dict
    auth_mode: str = "bearer"


@dataclass
class PendingLogin:
    flow_token: str
    cookie: str


class KeyValueStore(Protocol):
    async def setex(self, name: str, time: int, value: str) -> object: ...

    async def get(self, name: str) -> str | bytes | None: ...

    async def delete(self, *names: str) -> object: ...

    async def expire(self, name: str, time: int) -> object: ...

    async def incrby(self, name: str, amount: int) -> int: ...

    def lock(self, name: str, **kwargs: Any) -> Any: ...


class SessionStore:
    pending_login_ttl = 5 * 60

    def __init__(self, redis: KeyValueStore, secret_box: SecretBox, ttl: int, namespace: str = "newapi-mobile"):
        self.redis = redis
        self.secret_box = secret_box
        self.ttl = ttl
        self.namespace = namespace

    async def create(self, session: UpstreamSession) -> str:
        token = new_session_token()
        await self.save(token, session)
        return token

    async def save(self, token: str, session: UpstreamSession) -> None:
        encrypted = self.secret_box.encrypt(json.dumps(asdict(session)))
        await self.redis.setex(session_key(token), self.ttl, encrypted)

    async def get(self, token: str) -> UpstreamSession | None:
        raw = await self.redis.get(session_key(token))
        if raw is None:
            return None
        value = raw.decode("utf-8") if isinstance(raw, bytes) else raw
        try:
            payload = json.loads(self.secret_box.decrypt(value))
        except (ValueError, json.JSONDecodeError, TypeError, KeyError):
            await self.delete(token)
            return None
        await self.redis.expire(session_key(token), self.ttl)
        return UpstreamSession(**payload)

    async def delete(self, token: str) -> None:
        await self.redis.delete(session_key(token))

    async def create_pending_login(self, flow_token: str, cookie: str) -> str:
        token = new_session_token()
        pending = PendingLogin(flow_token=flow_token, cookie=cookie)
        encrypted = self.secret_box.encrypt(json.dumps(asdict(pending)))
        await self.redis.setex(
            pending_login_key(token), self.pending_login_ttl, encrypted
        )
        return token

    async def get_pending_login(self, token: str) -> PendingLogin | None:
        key = pending_login_key(token)
        raw = await self.redis.get(key)
        if raw is None:
            return None
        value = raw.decode("utf-8") if isinstance(raw, bytes) else raw
        try:
            payload = json.loads(self.secret_box.decrypt(value))
            return PendingLogin(**payload)
        except (ValueError, json.JSONDecodeError, TypeError, KeyError):
            await self.redis.delete(key)
            return None

    async def delete_pending_login(self, token: str) -> None:
        await self.redis.delete(pending_login_key(token))

    async def add_used_tokens(self, user_id: int, amount: int) -> int:
        if amount <= 0:
            return await self.get_used_tokens(user_id)
        return int(await self.redis.incrby(f"{self.namespace}:usage:{user_id}:tokens", amount))

    async def get_used_tokens(self, user_id: int) -> int:
        raw = await self.redis.get(f"{self.namespace}:usage:{user_id}:tokens")
        return int(raw or 0)

    @asynccontextmanager
    async def refresh_guard(self, token: str) -> AsyncIterator[None]:
        lock = self.redis.lock(
            f"{session_key(token)}:refresh",
            timeout=15,
            blocking_timeout=10,
        )
        acquired = await lock.acquire()
        if not acquired:
            raise RuntimeError("无法获取会话刷新锁")
        try:
            yield
        finally:
            await lock.release()

    @staticmethod
    def needs_refresh(session: UpstreamSession) -> bool:
        return (
            session.auth_mode == "bearer"
            and session.access_expires_at <= int(time.time()) + 60
        )


def build_redis(url: str) -> Redis:
    return Redis.from_url(url, decode_responses=True)
