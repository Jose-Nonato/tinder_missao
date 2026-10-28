import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core import security
from app.core.roles import Role
from app.models.refresh_token import RefreshTokenModel
from app.models.user import UserModel

# Faz o Swagger exibir o botão "Authorize" para colar o access token.
bearer_scheme = HTTPBearer(description="Cole o `access_token` retornado em /auth/login")


def suspended_message(user: dict) -> str:
    reason = user.get("suspended_reason")
    return f"Conta suspensa. Motivo: {reason}" if reason else "Conta suspensa"


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    unauthorized = HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        "Token inválido ou expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = security.decode_token(credentials.credentials, "access")
    except jwt.InvalidTokenError:
        raise unauthorized
    # A sessão precisa estar viva: após logout, troca de senha ou suspensão o token deixa de valer
    # na hora, mesmo antes de expirar. Tokens antigos, sem `sid`, também são recusados.
    sid = payload.get("sid")
    if not sid or not await RefreshTokenModel.session_active(sid):
        raise unauthorized
    user = await UserModel.find_by_id(payload["sub"])
    if not user:
        raise unauthorized
    if user.get("suspended"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, suspended_message(user))
    user["_sid"] = sid  # só em memória: permite ao logout saber qual sessão encerrar
    return user


def require_roles(*roles: Role):
    """Dependência que exige que o usuário logado tenha um dos papéis informados."""
    allowed = {r.value for r in roles}

    async def checker(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user.get("role", Role.USER.value) not in allowed:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Permissão insuficiente")
        return current_user

    return checker
