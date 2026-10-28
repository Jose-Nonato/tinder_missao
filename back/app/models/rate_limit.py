import math
from datetime import datetime, timedelta, timezone

from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.core.database import get_db


class RateLimitModel:
    """Contadores de tentativas por chave (ex.: `login:email:x@y.com`), com bloqueio temporário.

    Cada chave tem uma janela fixa: ao atingir o limite dentro dela, fica bloqueada por um tempo.
    Os documentos expiram sozinhos (índice TTL em `expires_at`).
    """

    @staticmethod
    def _col():
        return get_db().rate_limits

    @classmethod
    async def locked_for(cls, key: str) -> int:
        """Segundos restantes de bloqueio (0 se a chave não está bloqueada)."""
        doc = await cls._col().find_one({"_id": key}, {"locked_until": 1})
        locked_until = doc.get("locked_until") if doc else None
        if not locked_until:
            return 0
        remaining = (locked_until - datetime.now(timezone.utc)).total_seconds()
        return max(0, math.ceil(remaining))

    @classmethod
    async def hit(cls, key: str, limit: int, window: timedelta, lock: timedelta) -> int:
        """Conta uma ocorrência; ao chegar em `limit` dentro da janela, bloqueia por `lock`."""
        col = cls._col()
        now = datetime.now(timezone.utc)
        doc = await col.find_one_and_update(
            {"_id": key, "window_start": {"$gt": now - window}},
            {"$inc": {"count": 1}},
            return_document=ReturnDocument.AFTER,
        )
        if doc is None:  # primeira ocorrência, ou a janela anterior já acabou
            fresh = {"_id": key, "count": 1, "window_start": now, "expires_at": now + window + lock}
            try:
                await col.replace_one({"_id": key}, fresh, upsert=True)
                doc = fresh
            except DuplicateKeyError:  # outra requisição criou ao mesmo tempo
                doc = await col.find_one_and_update(
                    {"_id": key}, {"$inc": {"count": 1}}, return_document=ReturnDocument.AFTER
                )
        if doc["count"] >= limit:
            await col.update_one(
                {"_id": key},
                {"$set": {"locked_until": now + lock, "expires_at": now + lock + window}},
            )
        return doc["count"]

    @classmethod
    async def clear(cls, key: str) -> None:
        await cls._col().delete_one({"_id": key})
