from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ReturnDocument

from app.core.database import get_db

_OPEN = ["pending", "issued"]  # ainda não resolvidas


class PasswordResetRequestModel:
    """Pedidos de "esqueci minha senha", atendidos pelo admin (coleção `password_reset_requests`)."""

    @staticmethod
    def _col():
        return get_db().password_reset_requests

    @classmethod
    async def upsert_pending(cls, user_id, email: str, contact: str) -> None:
        """Registra o pedido; se a pessoa já tem um em aberto, só o atualiza (sem duplicar)."""
        now = datetime.now(timezone.utc)
        updated = await cls._col().update_one(
            {"user_id": user_id, "status": {"$in": _OPEN}},
            {"$set": {"status": "pending", "contact": contact, "requested_at": now}},
        )
        if updated.matched_count == 0:
            await cls._col().insert_one(
                {
                    "user_id": user_id,
                    "email": email,
                    "contact": contact,
                    "status": "pending",
                    "requested_at": now,
                }
            )

    @classmethod
    async def get(cls, request_id: str) -> dict | None:
        try:
            oid = ObjectId(request_id)
        except (InvalidId, TypeError):
            return None
        return await cls._col().find_one({"_id": oid})

    @classmethod
    async def list(cls, status: str | None) -> list[dict]:
        filters = {"status": status} if status else {}
        return await cls._col().find(filters).sort("requested_at", -1).to_list(length=None)

    @classmethod
    async def summary(cls) -> dict[str, int]:
        counts = {"pending": 0, "issued": 0, "completed": 0, "dismissed": 0}
        cursor = await cls._col().aggregate([{"$group": {"_id": "$status", "n": {"$sum": 1}}}])
        async for row in cursor:
            counts[row["_id"]] = row["n"]
        return counts

    @classmethod
    async def mark_issued(cls, request_id, admin_id) -> dict | None:
        return await cls._col().find_one_and_update(
            {"_id": request_id, "status": {"$in": _OPEN}},
            {"$set": {"status": "issued", "issued_by": admin_id, "issued_at": datetime.now(timezone.utc)}},
            return_document=ReturnDocument.AFTER,
        )

    @classmethod
    async def dismiss(cls, request_id, admin_id) -> dict | None:
        return await cls._col().find_one_and_update(
            {"_id": request_id, "status": {"$in": _OPEN}},
            {"$set": {"status": "dismissed", "dismissed_by": admin_id, "dismissed_at": datetime.now(timezone.utc)}},
            return_document=ReturnDocument.AFTER,
        )

    @classmethod
    async def mark_completed(cls, request_id) -> None:
        await cls._col().update_one(
            {"_id": request_id, "status": "issued"},
            {"$set": {"status": "completed", "completed_at": datetime.now(timezone.utc)}},
        )
