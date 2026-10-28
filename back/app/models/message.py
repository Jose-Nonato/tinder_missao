from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId

from app.core.database import get_db


def pair_key(a, b) -> str:
    """Chave estável da conversa entre duas pessoas, independente da ordem."""
    return ":".join(sorted((str(a), str(b))))


class MessageModel:
    """Mensagens entre matches (coleção `messages`)."""

    @staticmethod
    def _col():
        return get_db().messages

    @classmethod
    async def create(cls, sender_id, recipient_id, text: str) -> dict:
        doc = {
            "pair": pair_key(sender_id, recipient_id),
            "sender_id": sender_id,
            "recipient_id": recipient_id,
            "text": text,
            "created_at": datetime.now(timezone.utc),
            "read_at": None,
        }
        result = await cls._col().insert_one(doc)
        doc["_id"] = result.inserted_id
        return doc

    @classmethod
    async def history(cls, a, b, before: str | None, limit: int) -> tuple[list[dict], bool]:
        """Página de mensagens (mais antigas -> mais novas) e se ainda há anteriores."""
        query: dict = {"pair": pair_key(a, b)}
        if before:
            try:
                query["_id"] = {"$lt": ObjectId(before)}
            except (InvalidId, TypeError):
                pass
        cursor = cls._col().find(query).sort("_id", -1).limit(limit + 1)
        docs = await cursor.to_list(length=limit + 1)
        has_more = len(docs) > limit
        return list(reversed(docs[:limit])), has_more

    @classmethod
    async def last_between(cls, a, b) -> dict | None:
        return await cls._col().find_one({"pair": pair_key(a, b)}, sort=[("_id", -1)])

    @classmethod
    async def unread_count(cls, sender_id, recipient_id) -> int:
        return await cls._col().count_documents(
            {"sender_id": sender_id, "recipient_id": recipient_id, "read_at": None}
        )

    @classmethod
    async def mark_read(cls, reader_id, other_id) -> int:
        """Marca como lidas as mensagens que `other_id` enviou para `reader_id`."""
        result = await cls._col().update_many(
            {"sender_id": other_id, "recipient_id": reader_id, "read_at": None},
            {"$set": {"read_at": datetime.now(timezone.utc)}},
        )
        return result.modified_count
