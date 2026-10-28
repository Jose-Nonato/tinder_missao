import math
import secrets
import uuid
from datetime import timedelta

import jwt
from fastapi import HTTPException, status

from app.core import security
from app.core.dependencies import suspended_message
from app.core.roles import Role
from app.core.ws_manager import manager
from app.models.password_reset import PasswordResetModel
from app.models.password_reset_request import PasswordResetRequestModel
from app.models.question import QuestionModel
from app.models.rate_limit import RateLimitModel
from app.models.refresh_token import RefreshTokenModel
from app.models.user import EmailOrUsernameTaken, UserModel
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserResponse,
)

# Limites de tentativas de login: 5 erros no mesmo email (ou 20 no mesmo IP) em 15 minutos
# bloqueiam novas tentativas por 15 minutos. Vale também para emails que não existem.
LOGIN_WINDOW = timedelta(minutes=15)
LOGIN_LOCK = timedelta(minutes=15)
MAX_FAILURES_PER_EMAIL = 5
MAX_FAILURES_PER_IP = 20

# Pedidos de redefinição de senha: 3 por email e 10 por IP a cada hora.
RESET_WINDOW = timedelta(hours=1)
MAX_RESETS_PER_EMAIL = 3
MAX_RESETS_PER_IP = 10

# Hash de mentira para gastar o mesmo tempo quando o email não existe (evita descobrir contas
# pelo tempo de resposta).
_DUMMY_HASH = security.hash_password(secrets.token_urlsafe(16))


def _invalid_credentials() -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, "Email ou senha inválidos")


def _invalid_refresh() -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh token inválido ou expirado")


def _too_many_attempts(seconds: int) -> HTTPException:
    minutes = max(1, math.ceil(seconds / 60))
    unit = "minuto" if minutes == 1 else "minutos"
    return HTTPException(
        status.HTTP_429_TOO_MANY_REQUESTS,
        f"Muitas tentativas. Tente novamente em {minutes} {unit}.",
        headers={"Retry-After": str(seconds)},
    )


async def _issue_tokens(user_id: str, sid: str | None = None) -> TokenResponse:
    """Emite o par de tokens; `sid` é a sessão (novo login = nova sessão, refresh = mesma)."""
    sid = sid or uuid.uuid4().hex
    refresh_token, jti, expires_at = security.create_refresh_token(user_id)
    await RefreshTokenModel.store(jti, user_id, expires_at, sid)
    return TokenResponse(
        access_token=security.create_access_token(user_id, sid),
        refresh_token=refresh_token,
    )


async def register(data: RegisterRequest) -> UserResponse:
    try:
        user = await UserModel.create(
            username=data.username,
            email=data.email.lower(),
            password_hash=security.hash_password(data.password),
        )
    except EmailOrUsernameTaken:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email ou username já cadastrado")
    return UserResponse.from_doc(user)


async def login(data: LoginRequest, ip: str) -> TokenResponse:
    email = data.email.lower().strip()
    email_key, ip_key = f"login:email:{email}", f"login:ip:{ip}"

    # Bloqueado? Recusa antes de olhar a senha: nem a senha certa passa durante o bloqueio.
    wait = max(await RateLimitModel.locked_for(email_key), await RateLimitModel.locked_for(ip_key))
    if wait:
        raise _too_many_attempts(wait)

    user = await UserModel.find_by_email(email)
    hashed = user["password_hash"] if user else _DUMMY_HASH
    if not security.verify_password(data.password, hashed) or not user:
        await RateLimitModel.hit(email_key, MAX_FAILURES_PER_EMAIL, LOGIN_WINDOW, LOGIN_LOCK)
        await RateLimitModel.hit(ip_key, MAX_FAILURES_PER_IP, LOGIN_WINDOW, LOGIN_LOCK)
        raise _invalid_credentials()

    await RateLimitModel.clear(email_key)  # acertou: zera os erros desse email
    if user.get("suspended"):  # só revela depois de a senha estar correta
        raise HTTPException(status.HTTP_403_FORBIDDEN, suspended_message(user))
    return await _issue_tokens(str(user["_id"]))


async def me(user: dict) -> UserResponse:
    # Sem perguntas ativas não há o que responder, então ninguém fica bloqueado.
    completed = user.get("questionnaire_completed", False) or not await QuestionModel.any_active()
    return UserResponse.from_doc(user, questionnaire_completed=completed)


async def refresh(refresh_token: str) -> TokenResponse:
    try:
        payload = security.decode_token(refresh_token, "refresh")
    except jwt.InvalidTokenError:
        raise _invalid_refresh()
    # rotação: cada refresh token só pode ser usado uma vez
    stored = await RefreshTokenModel.consume(payload["jti"])
    if not stored:
        raise _invalid_refresh()
    user = await UserModel.find_by_id(payload["sub"])
    if not user or user.get("suspended"):
        raise _invalid_refresh()
    # a sessão continua a mesma (tokens emitidos antes do `sid` existir ganham uma agora)
    return await _issue_tokens(payload["sub"], stored.get("sid"))


async def logout(user: dict) -> None:
    """Encerra só esta sessão: o access token dela para de valer na hora e o chat é desconectado."""
    await RefreshTokenModel.delete_session(user["_sid"])
    await manager.close(str(user["_id"]), user["_sid"])


async def logout_all(user: dict) -> None:
    """Encerra todas as sessões (todos os dispositivos)."""
    await RefreshTokenModel.delete_for_user(str(user["_id"]))
    await manager.close(str(user["_id"]))


async def forgot_password(email: str, contact: str, ip: str) -> None:
    """Registra um pedido para o admin atender. Nunca revela se a conta existe.

    Contas de admin e contas suspensas não geram pedido (a resposta continua igual).
    """
    email = email.lower().strip()
    email_key, ip_key = f"reset:email:{email}", f"reset:ip:{ip}"
    if await RateLimitModel.locked_for(email_key) or await RateLimitModel.locked_for(ip_key):
        return  # limite atingido: ignora em silêncio (a resposta continua igual)
    await RateLimitModel.hit(email_key, MAX_RESETS_PER_EMAIL, RESET_WINDOW, RESET_WINDOW)
    await RateLimitModel.hit(ip_key, MAX_RESETS_PER_IP, RESET_WINDOW, RESET_WINDOW)

    user = await UserModel.find_by_email(email)
    if not user or user.get("suspended") or user.get("role") == Role.ADMIN.value:
        return
    await PasswordResetRequestModel.upsert_pending(user["_id"], user["email"], contact.strip())


async def reset_password(data: ResetPasswordRequest) -> None:
    stored = await PasswordResetModel.consume(data.token)
    user = await UserModel.find_by_id(str(stored["user_id"])) if stored else None
    if not user:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Link inválido ou expirado")

    await UserModel.set_password(user["_id"], security.hash_password(data.new_password))
    # quem sabia a senha antiga (ou roubou uma sessão) perde o acesso
    await RefreshTokenModel.delete_for_user(str(user["_id"]))
    await manager.close(str(user["_id"]))
    await PasswordResetModel.delete_for_user(user["_id"])
    if stored.get("request_id"):
        await PasswordResetRequestModel.mark_completed(stored["request_id"])
    await RateLimitModel.clear(f"login:email:{user['email']}")  # libera quem ficou bloqueado
