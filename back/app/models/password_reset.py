import hashlib
from datetime import datetime, timedelta, timezone

from app.core.database import get_db


def hash_token(token: str) -> str:
    """O token só existe no link entregue pelo admin; no banco fica o hash."""
    return hashlib.sha256(token.encode()).hexdigest()


class PasswordResetModel:
    """Tokens de redefinição de senha: uso único, com validade curta."""

    @staticmethod
    def _col():
        return get_db().password_resets

    @classmethod
    async def create(cls, user_id, token: str, minutes: int, request_id=None) -> datetime:
        """Cria o token (apagando os anteriores da pessoa) e devolve quando ele expira."""
        col = cls._col()
        await col.delete_many({"user_id": user_id})  # só o link mais recente vale
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=minutes)
        await col.insert_one(
            {
                "token_hash": hash_token(token),
                "user_id": user_id,
                "request_id": request_id,
                "expires_at": expires_at,
            }
        )
        return expires_at

    @classmethod
    async def consume(cls, token: str) -> dict | None:
        """Remove e devolve o token se ainda for válido (uso único)."""
        return await cls._col().find_one_and_delete(
            {"token_hash": hash_token(token), "expires_at": {"$gt": datetime.now(timezone.utc)}}
        )

    @classmethod
    async def delete_for_user(cls, user_id) -> None:
        await cls._col().delete_many({"user_id": user_id})
