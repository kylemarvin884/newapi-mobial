import base64
import hashlib
import secrets

from cryptography.fernet import Fernet, InvalidToken


class SecretBox:
    def __init__(self, secret: str):
        digest = hashlib.sha256(secret.encode("utf-8")).digest()
        self._fernet = Fernet(base64.urlsafe_b64encode(digest))

    def encrypt(self, value: str) -> str:
        return self._fernet.encrypt(value.encode("utf-8")).decode("ascii")

    def decrypt(self, value: str) -> str:
        try:
            return self._fernet.decrypt(value.encode("ascii")).decode("utf-8")
        except InvalidToken as exc:
            raise ValueError("无法解密会话") from exc


def new_session_token() -> str:
    return secrets.token_urlsafe(48)


def session_key(token: str) -> str:
    digest = hashlib.sha256(token.encode("utf-8")).hexdigest()
    return f"mobile:session:{digest}"


def pending_login_key(token: str) -> str:
    digest = hashlib.sha256(token.encode("utf-8")).hexdigest()
    return f"mobile:pending-login:{digest}"
