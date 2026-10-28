from datetime import datetime

from app.core.database import get_db


class RefreshTokenModel:
    """Sessões do usuário: um refresh token vivo por sessão (`sid`), com rotação a cada uso.

    Enquanto existir um refresh token da sessão, os access tokens dela valem; ao apagar,
    eles deixam de valer imediatamente (logout real).
    """

    @staticmethod
    def _col():
        return get_db().refresh_tokens

    @classmethod
    async def store(cls, jti: str, user_id: str, expires_at: datetime, sid: str) -> None:
        await cls._col().insert_one(
            {"jti": jti, "user_id": user_id, "expires_at": expires_at, "sid": sid}
        )

    @classmethod
    async def consume(cls, jti: str) -> dict | None:
        """Remove e devolve o token (uso único); None se já foi usado ou não existe."""
        return await cls._col().find_one_and_delete({"jti": jti})

    @classmethod
    async def session_active(cls, sid: str) -> bool:
        return await cls._col().find_one({"sid": sid}, {"_id": 1}) is not None

    @classmethod
    async def delete_session(cls, sid: str) -> None:
        await cls._col().delete_many({"sid": sid})

    @classmethod
    async def delete_for_user(cls, user_id: str) -> None:
        """Derruba todas as sessões do usuário (suspensão, troca de senha, sair de tudo)."""
        await cls._col().delete_many({"user_id": user_id})
