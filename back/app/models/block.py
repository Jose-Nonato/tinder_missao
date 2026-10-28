from datetime import datetime, timezone

from app.core.database import get_db


class BlockModel:
    """Bloqueios entre usuários (coleção `blocks`)."""

    @staticmethod
    def _col():
        return get_db().blocks

    @classmethod
    async def add(cls, blocker_id, blocked_id) -> None:
        await cls._col().update_one(
            {"blocker_id": blocker_id, "blocked_id": blocked_id},
            {"$setOnInsert": {"created_at": datetime.now(timezone.utc)}},
            upsert=True,
        )

    @classmethod
    async def remove(cls, blocker_id, blocked_id) -> bool:
        result = await cls._col().delete_one({"blocker_id": blocker_id, "blocked_id": blocked_id})
        return result.deleted_count == 1

    @classmethod
    async def blocked_by(cls, blocker_id) -> list[dict]:
        cursor = cls._col().find({"blocker_id": blocker_id}).sort("created_at", -1)
        return await cursor.to_list(length=None)

    @classmethod
    async def hidden_ids(cls, user_id) -> set:
        """Quem eu bloqueei + quem me bloqueou: some do baralho e dos matches dos dois lados."""
        col = cls._col()
        ids = {b["blocked_id"] async for b in col.find({"blocker_id": user_id})}
        ids |= {b["blocker_id"] async for b in col.find({"blocked_id": user_id})}
        return ids
