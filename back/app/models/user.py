from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.core.database import get_db
from app.core.roles import Role


class EmailOrUsernameTaken(Exception):
    pass


class UserModel:
    """Camada de acesso a dados da coleção `users`."""

    # quem pode aparecer no baralho de alguém (antes de aplicar preferências)
    _ELIGIBLE = {
        "role": {"$ne": Role.ADMIN.value},
        "suspended": {"$ne": True},
        "answers.0": {"$exists": True},
        "profile_completed": True,
        "profile.birth_date": {"$exists": True},
    }

    @staticmethod
    def _col():
        return get_db().users

    @classmethod
    async def create(
        cls,
        username: str,
        email: str,
        password_hash: str,
        role: Role = Role.USER,
        *,
        terms_version: str | None = None,
    ) -> dict:
        doc = {
            "username": username,
            "email": email,
            "password_hash": password_hash,
            "role": role.value,
            "created_at": datetime.now(timezone.utc),
        }
        if terms_version is not None:
            doc.update(terms_accepted_at=datetime.now(timezone.utc), terms_version=terms_version)
        try:
            result = await cls._col().insert_one(doc)
        except DuplicateKeyError as exc:
            raise EmailOrUsernameTaken() from exc
        doc["_id"] = result.inserted_id
        return doc

    @classmethod
    async def find_by_email(cls, email: str) -> dict | None:
        return await cls._col().find_one({"email": email})

    @classmethod
    async def find_by_id(cls, user_id: str) -> dict | None:
        try:
            oid = ObjectId(user_id)
        except (InvalidId, TypeError):
            return None
        return await cls._col().find_one({"_id": oid})

    @classmethod
    async def list_all(cls) -> list[dict]:
        return await cls._col().find().sort("created_at", 1).to_list(length=None)

    @classmethod
    async def update_role(cls, user_id: str, role: Role) -> dict | None:
        try:
            oid = ObjectId(user_id)
        except (InvalidId, TypeError):
            return None
        return await cls._col().find_one_and_update(
            {"_id": oid},
            {"$set": {"role": role.value}},
            return_document=ReturnDocument.AFTER,
        )

    @classmethod
    async def merge_answers(cls, user_oid, new_answers: list[dict]) -> dict:
        """Substitui/adiciona respostas por questionId em uma única operação atômica."""
        ids = [a["questionId"] for a in new_answers]
        kept = {
            "$filter": {
                "input": {"$ifNull": ["$answers", []]},
                "as": "a",
                "cond": {"$not": [{"$in": ["$$a.questionId", ids]}]},
            }
        }
        return await cls._col().find_one_and_update(
            {"_id": user_oid},
            [{"$set": {"answers": {"$concatArrays": [kept, new_answers]}}}],
            return_document=ReturnDocument.AFTER,
        )

    @classmethod
    async def mark_questionnaire_completed(cls, user_oid) -> None:
        await cls._col().update_one(
            {"_id": user_oid}, {"$set": {"questionnaire_completed": True}}
        )

    @classmethod
    async def find_candidates(cls, self_id, my_gender: str, my_interest: str) -> list[dict]:
        """Todos que combinam com as preferências nos dois sentidos (inclusive os já avaliados)."""
        wanted = {"men": ["male"], "women": ["female"], "both": ["male", "female"]}[my_interest]
        # a outra pessoa precisa querer ver o meu sexo
        their_interest = ["men", "both"] if my_gender == "male" else ["women", "both"]
        cursor = cls._col().find(
            {
                **cls._ELIGIBLE,
                "_id": {"$ne": self_id},
                "profile.gender": {"$in": wanted},
                "profile.interested_in": {"$in": their_interest},
            },
            {"username": 1, "answers": 1, "profile": 1},
        )
        return await cursor.to_list(length=None)

    @classmethod
    async def count_eligible_others(cls, self_id) -> int:
        """Quantas outras pessoas poderiam aparecer para alguém, ignorando preferências."""
        return await cls._col().count_documents({**cls._ELIGIBLE, "_id": {"$ne": self_id}})

    @classmethod
    async def find_many(cls, oids: list) -> list[dict]:
        cursor = cls._col().find({"_id": {"$in": oids}}, {"username": 1, "answers": 1, "role": 1, "profile": 1, "suspended": 1, "suspended_reason": 1})
        return await cursor.to_list(length=None)

    @classmethod
    async def save_profile(cls, user_oid, profile: dict) -> None:
        await cls._col().update_one(
            {"_id": user_oid}, {"$set": {"profile": profile, "profile_completed": True}}
        )

    @classmethod
    async def photos_in_use(cls, urls: list[str]) -> set[str]:
        """Quais destas URLs ainda aparecem no perfil de alguém."""
        cursor = cls._col().find({"profile.photos": {"$in": urls}}, {"profile.photos": 1})
        return {u async for d in cursor for u in d["profile"]["photos"] if u in urls}

    @classmethod
    async def suspend(cls, user_oid, reason: str, admin_oid) -> bool:
        result = await cls._col().update_one(
            {"_id": user_oid},
            {
                "$set": {
                    "suspended": True,
                    "suspended_reason": reason,
                    "suspended_by": admin_oid,
                    "suspended_at": datetime.now(timezone.utc),
                }
            },
        )
        return result.matched_count == 1

    @classmethod
    async def unsuspend(cls, user_oid) -> bool:
        result = await cls._col().update_one(
            {"_id": user_oid},
            {
                "$set": {"suspended": False},
                "$unset": {"suspended_reason": "", "suspended_by": "", "suspended_at": ""},
            },
        )
        return result.matched_count == 1

    @classmethod
    async def set_password(cls, user_oid, password_hash: str) -> None:
        await cls._col().update_one(
            {"_id": user_oid},
            {"$set": {"password_hash": password_hash, "password_changed_at": datetime.now(timezone.utc)}},
        )
