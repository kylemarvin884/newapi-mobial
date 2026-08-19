from typing import Any

from fastapi import HTTPException, status


class UpstreamError(Exception):
    def __init__(self, message: str, status_code: int = 502, data: Any = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.data = data


def unauthorized(message: str = "登录已失效，请重新登录") -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=message)

