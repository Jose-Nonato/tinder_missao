import uuid
from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash

from app.core.config import settings

_password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return _password_hash.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return _password_hash.verify(password, hashed)


def _encode(
    sub: str, token_type: str, expires: timedelta, jti: str | None = None, sid: str | None = None
):
    now = datetime.now(timezone.utc)
    payload = {"sub": sub, "type": token_type, "iat": now, "exp": now + expires}
    if jti:
        payload["jti"] = jti
    if sid:
        payload["sid"] = sid
    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return token, payload["exp"]


def create_access_token(user_id: str, sid: str) -> str:
    """`sid` identifica a sessão (login); apagar a sessão invalida o token na hora."""
    token, _ = _encode(
        user_id, "access", timedelta(minutes=settings.access_token_expire_minutes), sid=sid
    )
    return token


def create_refresh_token(user_id: str) -> tuple[str, str, datetime]:
    """Retorna (token, jti, expira_em)."""
    jti = uuid.uuid4().hex
    token, exp = _encode(
        user_id, "refresh", timedelta(days=settings.refresh_token_expire_days), jti
    )
    return token, jti, exp


def decode_token(token: str, expected_type: str) -> dict:
    """Levanta jwt.InvalidTokenError se inválido, expirado ou de tipo errado."""
    payload = jwt.decode(
        token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
    )
    if payload.get("type") != expected_type:
        raise jwt.InvalidTokenError("Tipo de token inválido")
    return payload
