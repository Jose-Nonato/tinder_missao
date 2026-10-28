from datetime import datetime, timezone

from app.core.database import get_db


class SwipeModel:
    """Curtidas e descartes entre usuários (coleção `swipes`)."""

    @staticmethod
    def _col():
        return get_db().swipes

    @classmethod
    async def upsert(cls, from_id, to_id, action: str) -> None:
        await cls._col().update_one(
            {"from_id": from_id, "to_id": to_id},
            {"$set": {"action": action, "created_at": datetime.now(timezone.utc)}},
            upsert=True,
        )

    @classmethod
    async def swiped_ids(cls, from_id) -> list:
        """Ids que o usuário já curtiu ou descartou."""
        cursor = cls._col().find({"from_id": from_id}, {"to_id": 1})
        return [s["to_id"] async for s in cursor]

    @classmethod
    async def liked_me(cls, from_id, to_id) -> dict | None:
        return await cls._col().find_one(
            {"from_id": from_id, "to_id": to_id, "action": "like"}
        )

    @classmethod
    async def matches_of(cls, user_id) -> list[dict]:
        """[{user_id, matched_at}] das curtidas mútuas, mais recentes primeiro."""
        mine = {
            s["to_id"]: s["created_at"]
            async for s in cls._col().find({"from_id": user_id, "action": "like"})
        }
        if not mine:
            return []
        theirs = cls._col().find(
            {"from_id": {"$in": list(mine)}, "to_id": user_id, "action": "like"}
        )
        matches = [
            {"user_id": s["from_id"], "matched_at": max(mine[s["from_id"]], s["created_at"])}
            async for s in theirs
        ]
        return sorted(matches, key=lambda m: m["matched_at"], reverse=True)
