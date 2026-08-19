from dataclasses import dataclass

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.errors import UpstreamError, unauthorized
from app.services.newapi import NewApiClient, build_upstream_session
from app.services.session_store import SessionStore, UpstreamSession


bearer = HTTPBearer(auto_error=False)


@dataclass
class AuthContext:
    token: str
    session: UpstreamSession


def get_session_store(request: Request) -> SessionStore:
    return request.app.state.session_store


def get_newapi(request: Request) -> NewApiClient:
    return request.app.state.newapi


async def get_auth_context(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    store: SessionStore = Depends(get_session_store),
    newapi: NewApiClient = Depends(get_newapi),
) -> AuthContext:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise unauthorized()
    session = await store.get(credentials.credentials)
    if session is None:
        raise unauthorized()
    if store.needs_refresh(session):
        async with store.refresh_guard(credentials.credentials):
            latest = await store.get(credentials.credentials)
            if latest is None:
                raise unauthorized()
            session = latest
            if store.needs_refresh(session):
                if not session.refresh_cookie:
                    await store.delete(credentials.credentials)
                    raise unauthorized()
                try:
                    payload, set_cookie = await newapi.refresh(
                        session.refresh_cookie, session.session_id
                    )
                    session = build_upstream_session(payload, set_cookie)
                    await store.save(credentials.credentials, session)
                except UpstreamError as exc:
                    await store.delete(credentials.credentials)
                    raise unauthorized() from exc
    return AuthContext(token=credentials.credentials, session=session)
