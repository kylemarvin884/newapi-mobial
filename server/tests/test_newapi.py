import json

import httpx
import pytest
import respx

from app.schemas import ApiKeyCreate, ImageGenerationRequest
from app.services.newapi import NewApiClient, build_upstream_session, extract_refresh_cookie
from app.services.session_store import UpstreamSession


def test_extract_refresh_cookie() -> None:
    assert extract_refresh_cookie("refresh_token=abc; Path=/; HttpOnly") == "refresh_token=abc"


def test_build_upstream_session() -> None:
    payload = {
        "data": {
            "access_token": "access",
            "access_expires_at": 9999999999,
            "session": {"sid": "sid-7"},
            "user": {"id": 7, "username": "paul"},
        }
    }
    session = build_upstream_session(payload, "refresh_token=abc; Path=/")
    assert session.user_id == 7
    assert session.refresh_cookie == "refresh_token=abc"
    assert session.session_id == "sid-7"
    assert session.auth_mode == "bearer"


def test_build_upstream_session_from_classic_cookie_login() -> None:
    payload = {
        "data": {
            "id": 7,
            "username": "paul",
            "display_name": "Paul",
            "group": "default",
        }
    }
    session = build_upstream_session(payload, "session=opaque; Path=/; HttpOnly")
    assert session.user_id == 7
    assert session.access_token == ""
    assert session.refresh_cookie == "session=opaque"
    assert session.auth_mode == "cookie"


@pytest.mark.asyncio
@respx.mock
async def test_login_captures_classic_session_cookie() -> None:
    respx.post("https://example.com/api/user/login").mock(
        return_value=httpx.Response(
            200,
            json={
                "success": True,
                "message": "",
                "data": {"id": 7, "username": "paul", "group": "default"},
            },
            headers={"set-cookie": "session=opaque; Path=/; HttpOnly"},
        )
    )
    client = NewApiClient("https://example.com")
    payload, cookie = await client.login("paul", "not-logged")
    session = build_upstream_session(payload, cookie)
    assert cookie == "session=opaque"
    assert session.auth_mode == "cookie"


@pytest.mark.asyncio
@respx.mock
async def test_registration_uses_email_verification_contract() -> None:
    verification = respx.get("https://example.com/api/verification").mock(
        return_value=httpx.Response(200, json={"success": True, "message": ""})
    )
    registration = respx.post("https://example.com/api/user/register").mock(
        return_value=httpx.Response(200, json={"success": True, "message": ""})
    )
    client = NewApiClient("https://example.com")

    await client.send_email_verification("paul@example.com")
    await client.register("paul", "password123", "paul@example.com", "123456")

    assert verification.calls.last.request.url.params["email"] == "paul@example.com"
    assert json.loads(registration.calls.last.request.content) == {
        "username": "paul",
        "password": "password123",
        "email": "paul@example.com",
        "verification_code": "123456",
    }


@pytest.mark.asyncio
@respx.mock
async def test_classic_session_sends_cookie_and_user_id() -> None:
    route = respx.get("https://example.com/api/user/self").mock(
        return_value=httpx.Response(
            200,
            json={
                "success": True,
                "message": "",
                "data": {"id": 7, "username": "paul"},
            },
        )
    )
    client = NewApiClient("https://example.com")
    session = UpstreamSession(
        user_id=7,
        access_token="",
        access_expires_at=0,
        refresh_cookie="session=opaque",
        session_id="",
        user={"id": 7, "username": "paul"},
        auth_mode="cookie",
    )
    user = await client.get_self(session)
    request = route.calls.last.request
    assert user["id"] == 7
    assert request.headers["cookie"] == "session=opaque"
    assert request.headers["new-api-user"] == "7"


@pytest.mark.asyncio
@respx.mock
async def test_models_are_returned_by_user_group() -> None:
    respx.get("https://example.com/api/user/self/groups").mock(
        return_value=httpx.Response(
            200,
            json={
                "success": True,
                "data": {
                    "vip": {"desc": "高级模型", "ratio": 2},
                    "default": {"desc": "默认模型", "ratio": 1},
                },
            },
        )
    )
    respx.get("https://example.com/api/user/models", params={"group": "default"}).mock(
        return_value=httpx.Response(
            200,
            json={"success": True, "data": ["gpt-4o-mini", "deepseek-chat"]},
        )
    )
    respx.get("https://example.com/api/user/models", params={"group": "vip"}).mock(
        return_value=httpx.Response(
            200,
            json={"success": True, "data": [{"id": "claude-sonnet-4"}]},
        )
    )
    client = NewApiClient("https://example.com")
    session = UpstreamSession(
        user_id=7,
        access_token="",
        access_expires_at=0,
        refresh_cookie="session=opaque",
        session_id="",
        user={"id": 7},
        auth_mode="cookie",
    )

    groups = await client.list_model_groups(session)

    assert [group["id"] for group in groups] == ["default", "vip"]
    assert groups[0]["description"] == "默认模型"
    assert groups[0]["models"] == ["deepseek-chat", "gpt-4o-mini"]
    assert groups[1]["models"] == ["claude-sonnet-4"]


def test_token_body_matches_newapi_contract() -> None:
    request = ApiKeyCreate(
        name="mobile",
        unlimited_quota=False,
        remain_quota=500000,
        model_limits=["gpt-4o-mini"],
        allow_ips=["1.2.3.4"],
    )
    body = NewApiClient._token_body(request)
    assert body["model_limits_enabled"] is True
    assert body["model_limits"] == "gpt-4o-mini"
    assert body["allow_ips"] == "1.2.3.4"


@pytest.mark.asyncio
@respx.mock
async def test_image_generation_uses_openai_image_contract() -> None:
    route = respx.post("https://example.com/v1/images/generations").mock(
        return_value=httpx.Response(
            200,
            json={
                "created": 1,
                "data": [{"url": "https://cdn.example.com/image.png"}],
                "usage": {"total_tokens": 42},
            },
        )
    )
    client = NewApiClient("https://example.com")
    request = ImageGenerationRequest(
        token_id=3,
        model="gpt-image-1",
        prompt="a green mountain",
        size="1024x1024",
        quality="standard",
    )

    result = await client.generate_image("sk-test", request)

    body = json.loads(route.calls.last.request.content)
    assert route.calls.last.request.headers["authorization"] == "Bearer sk-test"
    assert body == {
        "model": "gpt-image-1",
        "prompt": "a green mountain",
        "n": 1,
        "size": "1024x1024",
        "quality": "standard",
        "response_format": "url",
    }
    assert result["usage"]["total_tokens"] == 42


@pytest.mark.asyncio
@respx.mock
async def test_refresh_sends_cookie_origin_and_session_id() -> None:
    route = respx.post("https://example.com/api/user/auth/refresh").mock(
        return_value=httpx.Response(
            200,
            json={
                "success": True,
                "data": {
                    "access_token": "new-access",
                    "access_expires_at": 9999999999,
                    "session": {"sid": "sid-7"},
                    "user": {"id": 7, "username": "paul"},
                },
            },
            headers={"set-cookie": "refresh_token=new; Path=/; HttpOnly"},
        )
    )
    client = NewApiClient("https://example.com")
    payload, cookie = await client.refresh("refresh_token=old", "sid-7")
    request = route.calls.last.request
    assert request.headers["cookie"] == "refresh_token=old"
    assert request.headers["x-auth-session"] == "sid-7"
    assert request.headers["origin"] == "https://example.com"
    assert payload["data"]["access_token"] == "new-access"
    assert cookie.startswith("refresh_token=new")


@pytest.mark.asyncio
@respx.mock
async def test_classic_two_factor_reuses_pending_cookie() -> None:
    route = respx.post("https://example.com/api/user/login/2fa").mock(
        return_value=httpx.Response(
            200,
            json={
                "success": True,
                "message": "",
                "data": {"id": 7, "username": "paul", "group": "default"},
            },
            headers={"set-cookie": "session=authenticated; Path=/; HttpOnly"},
        )
    )
    client = NewApiClient("https://example.com")
    payload, cookie = await client.verify_two_factor(
        "", "123456", "session=pending"
    )
    request = route.calls.last.request
    assert request.headers["cookie"] == "session=pending"
    assert request.content == b'{"code":"123456"}'
    assert payload["data"]["id"] == 7
    assert cookie == "session=authenticated"


@pytest.mark.asyncio
@respx.mock
async def test_logout_uses_newapi_auth_logout_contract() -> None:
    route = respx.post("https://example.com/api/user/auth/logout").mock(
        return_value=httpx.Response(200, json={"success": True, "data": {}})
    )
    client = NewApiClient("https://example.com")
    session = UpstreamSession(
        user_id=7,
        access_token="access",
        access_expires_at=9999999999,
        refresh_cookie="refresh_token=old",
        session_id="sid-7",
        user={"id": 7, "username": "paul"},
    )
    await client.logout(session)
    request = route.calls.last.request
    assert request.headers["authorization"] == "Bearer access"
    assert request.headers["cookie"] == "refresh_token=old"
    assert request.headers["x-auth-session"] == "sid-7"


@pytest.mark.asyncio
@respx.mock
async def test_logout_uses_classic_cookie_contract() -> None:
    route = respx.get("https://example.com/api/user/logout").mock(
        return_value=httpx.Response(200, json={"success": True, "message": ""})
    )
    client = NewApiClient("https://example.com")
    session = UpstreamSession(
        user_id=7,
        access_token="",
        access_expires_at=0,
        refresh_cookie="session=opaque",
        session_id="",
        user={"id": 7, "username": "paul"},
        auth_mode="cookie",
    )
    await client.logout(session)
    request = route.calls.last.request
    assert request.headers["cookie"] == "session=opaque"
    assert request.headers["new-api-user"] == "7"
