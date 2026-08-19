import json
from typing import Any

import httpx

from app.core.errors import UpstreamError
from app.schemas import ApiKeyCreate, ApiKeyUpdate, ChatRequest, ImageGenerationRequest
from app.services.session_store import UpstreamSession


class NewApiClient:
    def __init__(self, base_url: str, timeout: float = 60.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    async def login(self, username: str, password: str) -> tuple[dict, str]:
        async with httpx.AsyncClient(base_url=self.base_url, timeout=self.timeout) as client:
            response = await client.post(
                "/api/user/login",
                json={"username": username, "password": password},
            )
        payload = self._payload(response)
        return payload, self._response_cookie_header(response)

    async def send_email_verification(self, email: str) -> None:
        async with httpx.AsyncClient(base_url=self.base_url, timeout=self.timeout) as client:
            response = await client.get("/api/verification", params={"email": email})
        self._payload(response)

    async def register(
        self, username: str, password: str, email: str, verification_code: str
    ) -> None:
        async with httpx.AsyncClient(base_url=self.base_url, timeout=self.timeout) as client:
            response = await client.post(
                "/api/user/register",
                json={
                    "username": username,
                    "password": password,
                    "email": email,
                    "verification_code": verification_code,
                },
            )
        self._payload(response)

    async def verify_two_factor(
        self, flow_token: str, code: str, cookie: str = ""
    ) -> tuple[dict, str]:
        body = {"code": code}
        if flow_token:
            body["flow_token"] = flow_token
        headers = {"cookie": cookie} if cookie else None
        async with httpx.AsyncClient(base_url=self.base_url, timeout=self.timeout) as client:
            response = await client.post(
                "/api/user/login/2fa",
                json=body,
                headers=headers,
            )
        payload = self._payload(response)
        return payload, self._response_cookie_header(response, cookie)

    async def refresh(self, refresh_cookie: str, session_id: str) -> tuple[dict, str]:
        async with httpx.AsyncClient(base_url=self.base_url, timeout=self.timeout) as client:
            response = await client.post(
                "/api/user/auth/refresh",
                headers={
                    "cookie": refresh_cookie,
                    "origin": self.base_url,
                    "referer": f"{self.base_url}/",
                    "X-Auth-Session": session_id,
                },
            )
        payload = self._payload(response)
        return payload, self._response_cookie_header(response, refresh_cookie)

    async def logout(self, session: UpstreamSession) -> None:
        if session.auth_mode == "cookie":
            method = "GET"
            path = "/api/user/logout"
            headers = self._auth_headers(session)
        else:
            method = "POST"
            path = "/api/user/auth/logout"
            headers = {
                **self._auth_headers(session),
                "cookie": session.refresh_cookie,
                "origin": self.base_url,
                "referer": f"{self.base_url}/",
                "X-Auth-Session": session.session_id,
            }
        async with httpx.AsyncClient(base_url=self.base_url, timeout=self.timeout) as client:
            response = await client.request(method, path, headers=headers)
        self._payload(response)

    async def get_self(self, session: UpstreamSession) -> dict:
        return await self._request("GET", "/api/user/self", session)

    async def list_tokens(self, session: UpstreamSession) -> list[dict]:
        payload = await self._request(
            "GET", "/api/token/", session, params={"p": 0, "page_size": 100}
        )
        if isinstance(payload, list):
            return payload
        return payload.get("items", [])

    async def list_groups(self, session: UpstreamSession) -> list[dict]:
        payload = await self._request("GET", "/api/user/self/groups", session)
        if not isinstance(payload, dict):
            return []
        groups = []
        for group_id, details in payload.items():
            info = details if isinstance(details, dict) else {}
            groups.append(
                {
                    "id": str(group_id),
                    "description": str(info.get("desc") or ""),
                    "ratio": str(info.get("ratio") or ""),
                }
            )
        return sorted(
            groups,
            key=lambda item: (
                item["id"] != "default",
                item["id"] == "auto",
                item["id"],
            ),
        )

    async def get_token(self, session: UpstreamSession, token_id: int) -> dict:
        return await self._request("GET", f"/api/token/{token_id}", session)

    async def reveal_token(self, session: UpstreamSession, token_id: int) -> str:
        payload = await self._request("POST", f"/api/token/{token_id}/key", session)
        return payload["key"]

    async def create_token(self, session: UpstreamSession, request: ApiKeyCreate) -> None:
        await self._request("POST", "/api/token/", session, json=self._token_body(request))

    async def update_token(
        self, session: UpstreamSession, token_id: int, request: ApiKeyUpdate
    ) -> dict:
        body = self._token_body(request)
        body["id"] = token_id
        body["status"] = request.status
        return await self._request("PUT", "/api/token/", session, json=body)

    async def set_token_status(
        self, session: UpstreamSession, token_id: int, status: int
    ) -> dict:
        return await self._request(
            "PUT",
            "/api/token/?status_only=true",
            session,
            json={"id": token_id, "status": status},
        )

    async def delete_token(self, session: UpstreamSession, token_id: int) -> None:
        await self._request("DELETE", f"/api/token/{token_id}", session)

    async def list_models(self, session: UpstreamSession) -> list[dict]:
        payload = await self._request("GET", "/api/user/models", session)
        if isinstance(payload, list):
            return [{"id": item} if isinstance(item, str) else item for item in payload]
        if isinstance(payload, dict):
            return [{"id": key} for key in payload]
        return []

    async def list_model_groups(self, session: UpstreamSession) -> list[dict]:
        result = []
        for group in await self.list_groups(session):
            payload = await self._request(
                "GET",
                "/api/user/models",
                session,
                params={"group": group["id"]},
            )
            models = self._model_ids(payload)
            result.append({**group, "models": sorted(set(models))})
        return result

    async def chat(self, api_key: str, request: ChatRequest) -> dict:
        body: dict[str, Any] = {
            "model": request.model,
            "messages": [message.model_dump() for message in request.messages],
            "stream": False,
        }
        if request.temperature is not None:
            body["temperature"] = request.temperature
        if request.max_tokens is not None:
            body["max_tokens"] = request.max_tokens
        async with httpx.AsyncClient(base_url=self.base_url, timeout=self.timeout) as client:
            response = await client.post(
                "/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json=body,
            )
        if response.is_error:
            self._raise_http_error(response)
        try:
            return response.json()
        except json.JSONDecodeError as exc:
            raise UpstreamError("上游返回了无效的聊天响应") from exc

    async def generate_image(
        self, api_key: str, request: ImageGenerationRequest
    ) -> dict:
        body: dict[str, Any] = {
            "model": request.model,
            "prompt": request.prompt,
            "n": request.n,
            "size": request.size,
            "quality": request.quality,
            "response_format": "url",
        }
        async with httpx.AsyncClient(base_url=self.base_url, timeout=self.timeout) as client:
            response = await client.post(
                "/v1/images/generations",
                headers={"Authorization": f"Bearer {api_key}"},
                json=body,
            )
        if response.is_error:
            self._raise_http_error(response)
        try:
            return response.json()
        except json.JSONDecodeError as exc:
            raise UpstreamError("上游返回了无效的生图响应") from exc

    async def _request(
        self,
        method: str,
        path: str,
        session: UpstreamSession,
        **kwargs: Any,
    ) -> Any:
        headers = kwargs.pop("headers", {})
        headers.update(self._auth_headers(session))
        async with httpx.AsyncClient(base_url=self.base_url, timeout=self.timeout) as client:
            response = await client.request(method, path, headers=headers, **kwargs)
        return self._payload(response).get("data")

    @staticmethod
    def _auth_headers(session: UpstreamSession) -> dict[str, str]:
        if session.auth_mode == "cookie":
            return {
                "Cookie": session.refresh_cookie,
                "New-Api-User": str(session.user_id),
            }
        return {"Authorization": f"Bearer {session.access_token}"}

    @staticmethod
    def _response_cookie_header(response: httpx.Response, fallback: str = "") -> str:
        cookies = "; ".join(
            f"{name}={value}" for name, value in response.cookies.items()
        )
        if cookies:
            return cookies
        return extract_refresh_cookie(response.headers.get("set-cookie", "")) or fallback

    @staticmethod
    def _token_body(request: ApiKeyCreate | ApiKeyUpdate) -> dict[str, Any]:
        return {
            "name": request.name,
            "expired_time": request.expired_time,
            "remain_quota": request.remain_quota,
            "unlimited_quota": request.unlimited_quota,
            "model_limits_enabled": bool(request.model_limits),
            "model_limits": ",".join(request.model_limits),
            "allow_ips": "\n".join(request.allow_ips),
            "group": request.group,
        }

    @staticmethod
    def _model_ids(payload: Any) -> list[str]:
        if isinstance(payload, dict):
            if isinstance(payload.get("id"), str):
                candidates: list[Any] = [payload]
            else:
                candidates = list(payload)
        elif isinstance(payload, list):
            candidates = payload
        else:
            return []

        model_ids = []
        for item in candidates:
            if isinstance(item, str):
                model_ids.append(item)
            elif isinstance(item, dict) and isinstance(item.get("id"), str):
                model_ids.append(item["id"])
        return model_ids

    @classmethod
    def _payload(cls, response: httpx.Response) -> dict:
        if response.is_error:
            cls._raise_http_error(response)
        try:
            payload = response.json()
        except json.JSONDecodeError as exc:
            raise UpstreamError("NewAPI 返回了无效响应") from exc
        if not payload.get("success", False):
            raise UpstreamError(payload.get("message") or "NewAPI 请求失败", 400, payload)
        return payload

    @staticmethod
    def _raise_http_error(response: httpx.Response) -> None:
        message = f"NewAPI 请求失败 ({response.status_code})"
        try:
            payload = response.json()
            message = payload.get("message") or payload.get("error", {}).get("message") or message
        except (json.JSONDecodeError, AttributeError):
            pass
        status_code = 401 if response.status_code in (401, 403) else 502
        raise UpstreamError(message, status_code)


def extract_refresh_cookie(set_cookie: str) -> str:
    if not set_cookie:
        return ""
    cookie = set_cookie.split(";", 1)[0]
    return cookie.strip()


def build_upstream_session(payload: dict, set_cookie: str) -> UpstreamSession:
    data = payload.get("data")
    if not isinstance(data, dict):
        raise UpstreamError("NewAPI 登录响应缺少会话信息")
    nested_user = data.get("user")
    user = nested_user if isinstance(nested_user, dict) else data
    if not user.get("id"):
        raise UpstreamError("NewAPI 登录响应缺少会话信息")

    access_token = data.get("access_token")
    cookie = extract_refresh_cookie(set_cookie)
    if access_token:
        auth_mode = "bearer"
    elif cookie:
        auth_mode = "cookie"
    else:
        raise UpstreamError("NewAPI 登录响应缺少会话信息")

    session = data.get("session")
    if not isinstance(session, dict):
        session = {}
    return UpstreamSession(
        user_id=int(user["id"]),
        access_token=str(access_token or ""),
        access_expires_at=int(data.get("access_expires_at", 0)),
        refresh_cookie=cookie,
        session_id=session.get("sid", ""),
        user=user,
        auth_mode=auth_mode,
    )
