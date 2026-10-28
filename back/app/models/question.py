from bson import ObjectId
from pymongo import ReturnDocument

from app.core.database import get_db


class QuestionModel:
    """Camada de acesso a dados da coleção `questions`."""

    @staticmethod
    def _col():
        return get_db().questions

    @classmethod
    async def create(cls, data: dict) -> dict:
        """O `code` é gerado automaticamente: igual ao `_id` (ObjectId em texto)."""
        oid = ObjectId()
        doc = {"_id": oid, "code": str(oid), **data}
        await cls._col().insert_one(doc)
        return doc

    @classmethod
    async def find_by_code(cls, code: str) -> dict | None:
        return await cls._col().find_one({"code": code})

    @classmethod
    async def list(cls, filters: dict) -> list[dict]:
        cursor = cls._col().find(filters).sort("_id", 1)  # ordem de criação
        return await cursor.to_list(length=None)

    @classmethod
    async def any_active(cls) -> bool:
        return await cls._col().find_one({"active": True}, {"_id": 1}) is not None

    @classmethod
    async def active_codes(cls) -> set[str]:
        cursor = cls._col().find({"active": True}, {"code": 1})
        return {q["code"] async for q in cursor}

    @classmethod
    async def active_map(cls) -> dict[str, dict]:
        """{code: {weight, topic, text}} das perguntas ativas."""
        cursor = cls._col().find({"active": True}, {"code": 1, "weight": 1, "topic": 1, "text": 1})
        return {
            q["code"]: {"weight": q.get("weight", 1), "topic": q["topic"], "text": q["text"]}
            async for q in cursor
        }

    @classmethod
    async def find_active_by_codes(cls, codes: list[str]) -> list[dict]:
        cursor = cls._col().find({"code": {"$in": codes}, "active": True})
        return await cursor.to_list(length=None)

    @classmethod
    async def update(cls, code: str, changes: dict) -> dict | None:
        return await cls._col().find_one_and_update(
            {"code": code},
            {"$set": changes},
            return_document=ReturnDocument.AFTER,
        )

    @classmethod
    async def delete(cls, code: str) -> bool:
        result = await cls._col().delete_one({"code": code})
        return result.deleted_count == 1
