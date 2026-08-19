from app.core.security import SecretBox, pending_login_key, session_key


def test_secret_box_round_trip() -> None:
    box = SecretBox("a" * 32)
    encrypted = box.encrypt("sensitive")
    assert encrypted != "sensitive"
    assert box.decrypt(encrypted) == "sensitive"


def test_session_key_does_not_expose_token() -> None:
    token = "mobile-secret-token"
    key = session_key(token)
    assert token not in key
    assert key.startswith("mobile:session:")


def test_pending_login_key_does_not_expose_token() -> None:
    token = "pending-secret-token"
    key = pending_login_key(token)
    assert token not in key
    assert key.startswith("mobile:pending-login:")
