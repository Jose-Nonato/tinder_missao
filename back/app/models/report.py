from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ReturnDocument

from app.core.database import get_db


class ReportModel:
    """Denúncias de usuários (coleção `reports`)."""

    @staticmethod
    def _col():
        return get_db().reports

    @classmethod
    async def create(cls, reporter_id, reported_id, reason: str, details: str) -> dict:
        doc = {
            "reporter_id": reporter_id,
            "reported_id": reported_id,
            "reason": reason,
            "details": details,
            "status": "open",
            "created_at": datetime.now(timezone.utc),
        }
        result = await cls._col().insert_one(doc)
        doc["_id"] = result.inserted_id
        return doc

    @classmethod
    async def has_open(cls, reporter_id, reported_id) -> bool:
        found = await cls._col().find_one(
            {"reporter_id": reporter_id, "reported_id": reported_id, "status": "open"}, {"_id": 1}
        )
        return found is not None

    @classmethod
    async def get(cls, report_id: str) -> dict | None:
        try:
            oid = ObjectId(report_id)
        except (InvalidId, TypeError):
            return None
        return await cls._col().find_one({"_id": oid})

    @classmethod
    async def list(cls, status: str | None, reason: str | None) -> list[dict]:
        filters = {}
        if status:
            filters["status"] = status
        if reason:
            filters["reason"] = reason
        return await cls._col().find(filters).sort("created_at", -1).to_list(length=None)

    @classmethod
    async def count_against(cls, reported_id) -> int:
        return await cls._col().count_documents({"reported_id": reported_id})

    @classmethod
    async def history_for(cls, reported_id, exclude_id) -> list[dict]:
        cursor = cls._col().find({"reported_id": reported_id, "_id": {"$ne": exclude_id}})
        return await cursor.sort("created_at", -1).to_list(length=None)

    @classmethod
    async def summary(cls) -> dict[str, int]:
        counts = {"open": 0, "resolved": 0, "dismissed": 0}
        cursor = await cls._col().aggregate([{"$group": {"_id": "$status", "n": {"$sum": 1}}}])
        async for row in cursor:
            counts[row["_id"]] = row["n"]
        return counts

    @classmethod
    async def set_resolution(cls, report_id: str, status: str, note: str, admin_id) -> dict | None:
        try:
            oid = ObjectId(report_id)
        except (InvalidId, TypeError):
            return None
        if status == "open":  # reabrir limpa a decisão anterior
            update = {
                "$set": {"status": "open", "resolution_note": ""},
                "$unset": {"resolved_by": "", "resolved_at": ""},
            }
        else:
            update = {
                "$set": {
                    "status": status,
                    "resolution_note": note,
                    "resolved_by": admin_id,
                    "resolved_at": datetime.now(timezone.utc),
                }
            }
        return await cls._col().find_one_and_update(
            {"_id": oid}, update, return_document=ReturnDocument.AFTER
        )

    @classmethod
    async def close_open_for_user(cls, reported_id, admin_id, note: str) -> int:
        result = await cls._col().update_many(
            {"reported_id": reported_id, "status": "open"},
            {
                "$set": {
                    "status": "resolved",
                    "resolution_note": note,
                    "resolved_by": admin_id,
                    "resolved_at": datetime.now(timezone.utc),
                }
            },
        )
        return result.modified_count
