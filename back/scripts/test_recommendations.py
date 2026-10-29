"""Repescagem de descartados nas recomendações; requer o Mongo local, nunca usa o banco do app."""
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from uuid import uuid4

from pymongo import AsyncMongoClient

from app.controllers.match_controller import recommendations
from app.core.config import settings
from app.schemas.match import EmptyReason

NOW = datetime.now(timezone.utc)
COOLDOWN = timedelta(days=7)  # fixo, para não depender do padrão configurado


def _user(name: str, gender: str, interested_in: str) -> dict:
    return {
        "username": name,
        "role": "user",
        "answers": [{"questionId": "q1", "optionId": "a"}],
        "profile_completed": True,
        "profile": {"birth_date": "1995-01-01", "gender": gender, "interested_in": interested_in},
    }


class RevisitTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.client = AsyncMongoClient(settings.mongodb_url, tz_aware=True, serverSelectionTimeoutMS=3000)
        self.db = self.client[f"recommendations_test_{uuid4().hex}"]
        self.patches = [
            patch(f"app.models.{m}.get_db", return_value=self.db) for m in ("user", "question", "swipe", "block")
        ] + [patch.object(settings, "pass_cooldown_days", COOLDOWN.days)]
        for p in self.patches:
            p.start()
        await self.db.questions.insert_one({"code": "q1", "active": True, "weight": 1, "topic": "t", "text": "?"})
        self.me = _user("eu", "male", "women")
        self.me["_id"] = (await self.db.users.insert_one(self.me)).inserted_id
        self.ids = {}
        for name in ("nova", "pulada_antiga", "pulada_recente", "pulada_mais_antiga", "curtida"):
            self.ids[name] = (await self.db.users.insert_one(_user(name, "female", "men"))).inserted_id

    async def asyncTearDown(self):
        for p in self.patches:
            p.stop()
        await self.client.drop_database(self.db.name)
        await self.client.close()

    async def _swipe(self, name: str, action: str, at: datetime):
        await self.db.swipes.insert_one({"from_id": self.me["_id"], "to_id": self.ids[name], "action": action, "created_at": at})

    async def test_new_first_then_due_passes_oldest_first(self):
        await self._swipe("pulada_antiga", "pass", NOW - COOLDOWN - timedelta(days=1))
        await self._swipe("pulada_mais_antiga", "pass", NOW - COOLDOWN - timedelta(days=5))
        await self._swipe("pulada_recente", "pass", NOW - timedelta(hours=1))
        await self._swipe("curtida", "like", NOW - COOLDOWN - timedelta(days=30))
        result = await recommendations(self.me, 50)
        self.assertEqual(
            [(p.username, p.revisiting) for p in result.profiles],
            [("nova", False), ("pulada_mais_antiga", True), ("pulada_antiga", True)],
        )

    async def test_only_passes_in_cooldown_explains_wait(self):
        await self._swipe("nova", "like", NOW)
        await self._swipe("curtida", "like", NOW)
        await self._swipe("pulada_antiga", "pass", NOW - COOLDOWN + timedelta(days=2, hours=1))
        await self._swipe("pulada_recente", "pass", NOW)
        await self._swipe("pulada_mais_antiga", "pass", NOW)
        result = await recommendations(self.me, 50)
        self.assertEqual(result.profiles, [])
        self.assertEqual(result.empty_reason, EmptyReason.ALL_SEEN)
        self.assertIn("em 3 dias", result.empty_message)

    async def test_all_liked_has_no_revisit(self):
        for name in self.ids:
            await self._swipe(name, "like", NOW - COOLDOWN * 2)
        result = await recommendations(self.me, 50)
        self.assertEqual(result.empty_reason, EmptyReason.ALL_SEEN)
        self.assertNotIn("pulou", result.empty_message)


if __name__ == "__main__":
    unittest.main()
