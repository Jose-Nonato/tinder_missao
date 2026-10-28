"""Integração do seed em banco temporário; requer o Mongo local, nunca usa o banco do app."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

from pymongo import AsyncMongoClient

from app.controllers.match_controller import _decisive_answers, _profile, recommendations
from app.core.config import settings
from app.core.security import verify_password
from app.models.user import UserModel
from app.schemas.profile import ProfileData
from app.schemas.question import QuestionResponse
from scripts import seed


class SeedTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.client = AsyncMongoClient(settings.mongodb_url, serverSelectionTimeoutMS=3000)
        self.db = self.client[f"seed_test_{uuid4().hex}"]
        self.temp = tempfile.TemporaryDirectory()
        self.upload = patch.object(seed, "UPLOAD_DIR", Path(self.temp.name))
        self.upload.start()
        await self.db.users.create_index("email", unique=True)
        await self.db.users.create_index("username", unique=True)
        await self.db.questions.create_index("code", unique=True)
        await self.db.swipes.create_index([("from_id", 1), ("to_id", 1)], unique=True)

    async def asyncTearDown(self):
        await self.client.drop_database(self.db.name)
        await self.client.close()
        self.upload.stop()
        self.temp.cleanup()

    async def test_seed_is_idempotent_and_compatible(self):
        await seed.populate(self.db)
        before = {u["email"]: u["_id"] async for u in self.db.users.find()}
        await seed.populate(self.db)
        self.assertEqual(before, {u["email"]: u["_id"] async for u in self.db.users.find()})
        self.assertEqual(await self.db.users.count_documents({}), 23)
        self.assertEqual(await self.db.questions.count_documents({}), 24)
        self.assertEqual(await self.db.swipes.count_documents({}), 44)
        active = {}
        async for q in self.db.questions.find():
            QuestionResponse.from_doc(q)
            self.assertEqual([o["text"] for o in q["options"]], seed.SCALE)
            active[q["code"]] = q
        me = await self.db.users.find_one({"email": "teste@exemplo.test"})
        self.assertTrue(verify_password("Teste@123", me["password_hash"]))
        scores = set()
        async for u in self.db.users.find():
            ProfileData.model_validate(u["profile"])
            self.assertNotEqual(u["role"], "admin")
            self.assertEqual(u["terms_version"], seed.TERMS_VERSION)
            self.assertIsNotNone(u["terms_accepted_at"])
            self.assertTrue(all((seed.UPLOAD_DIR / p.removeprefix("/uploads/")).is_file() for p in u["profile"]["photos"]))
            if u["email"] == "questionario@exemplo.test":
                self.assertFalse(u["questionnaire_completed"])
                self.assertEqual(u["answers"], [])
                continue
            self.assertEqual(len(u["answers"]), 24)
            for a in u["answers"]:
                self.assertIn(a["optionId"], {"NONE", *(o["id"] for o in active[a["questionId"]]["options"])})
            scores.add(_profile(u, _decisive_answers(me, active), active).compatibility)
        self.assertGreater(len(scores), 4)
        self.assertGreaterEqual(max(scores), 95)
        self.assertLessEqual(min(scores), 10)
        self.assertTrue(any(35 <= score <= 65 for score in scores))
        with patch("app.models.user.get_db", return_value=self.db):
            for gender in ("male", "female"):
                for interest in ("men", "women", "both"):
                    self.assertTrue(await UserModel.find_candidates(me["_id"], gender, interest))

    async def test_both_accounts_have_pending_likes_including_first_recommendation(self):
        await seed.populate(self.db)
        principal = await self.db.users.find_one({"email": "teste@exemplo.test"})
        people_ids = [u["_id"] async for u in self.db.users.find({
            "username": {"$in": [person[1] for person in seed.PEOPLE]},
        })]
        for email in ("teste@exemplo.test", "questionario@exemplo.test", "match@exemplo.test"):
            me = await self.db.users.find_one({"email": email})
            # Simula a conclusão do questionário sem alterar o estado inicial da conta.
            me["answers"] = principal["answers"]
            with (
                patch("app.models.user.get_db", return_value=self.db),
                patch("app.models.question.get_db", return_value=self.db),
                patch("app.models.swipe.get_db", return_value=self.db),
                patch("app.models.block.get_db", return_value=self.db),
            ):
                result = await recommendations(me, 50)
            self.assertGreaterEqual(len(result.profiles), 6)
            pending = {str(s["from_id"]) async for s in self.db.swipes.find({"to_id": me["_id"], "action": "like"})}
            self.assertIn(result.profiles[0].id, pending)
            # As curtidas de todos os perfis PEOPLE são garantidas; entre contas
            # de teste há somente as curtidas explícitas definidas pelo seed.
            recommended_people = {p.id for p in result.profiles} & {str(i) for i in people_ids}
            self.assertTrue(recommended_people <= pending)
            self.assertEqual(await self.db.swipes.count_documents({
                "from_id": me["_id"], "to_id": {"$in": people_ids},
            }), 0)

    async def test_reset_preserves_admin_and_unmarked_data(self):
        admin = {"email": "admin@exemplo.test", "username": "admin", "role": "admin", "seed": seed.SEED}
        real = {"email": "real@exemplo.test", "username": "real", "role": "user"}
        admin_id = (await self.db.users.insert_one(admin)).inserted_id
        real_id = (await self.db.users.insert_one(real)).inserted_id
        await self.db.questions.insert_one({"code": "real-question", "active": True, "options": [{"id": "yes"}, {"id": "no"}]})
        await self.db.swipes.insert_one({"from_id": real_id, "to_id": admin_id, "action": "like"})
        sentinel = seed.UPLOAD_DIR / "keep.svg"
        sentinel.write_text("keep")
        await seed.populate(self.db)
        user = await self.db.users.find_one({"email": "teste@exemplo.test"})
        for collection, fields in seed.RELATED_FIELDS.items():
            await self.db[collection].insert_one({fields[0]: str(user["_id"]) if collection == "refresh_tokens" else user["_id"]})
        await seed.reset(self.db)
        await seed.reset(self.db)
        self.assertEqual(await self.db.users.count_documents({}), 2)
        self.assertIsNotNone(await self.db.users.find_one({"_id": admin_id}))
        self.assertIsNotNone(await self.db.users.find_one({"_id": real_id}))
        self.assertEqual(await self.db.questions.count_documents({}), 1)
        self.assertEqual(await self.db.swipes.count_documents({}), 1)
        for collection in seed.RELATED_FIELDS:
            if collection != "swipes":
                self.assertEqual(await self.db[collection].count_documents({}), 0)
        self.assertEqual(list(seed.UPLOAD_DIR.iterdir()), [sentinel])

    async def test_reset_removes_legacy_seed_only(self):
        self.assertEqual(seed.SEED, "voto-a-dois-demo-v1")
        photo = "seed-missao-v1-old.svg"
        (seed.UPLOAD_DIR / photo).write_text("old")
        await self.db.users.insert_one({"email": "old@example.test", "username": "old", "role": "user", "seed": "missao-demo-v1", "profile": {"photos": ["/uploads/" + photo]}})
        await self.db.questions.insert_one({"code": "seed-missao-v1-q01", "seed": "missao-demo-v1"})
        await seed.reset(self.db)
        self.assertEqual(await self.db.users.count_documents({}), 0)
        self.assertEqual(await self.db.questions.count_documents({}), 0)
        self.assertFalse((seed.UPLOAD_DIR / photo).exists())

    async def test_collision_does_not_overwrite_existing_user(self):
        await self.db.users.insert_one({"email": "teste@exemplo.test", "username": "existing", "role": "admin"})
        with self.assertRaises(ValueError):
            await seed.populate(self.db)
        self.assertEqual(await self.db.users.count_documents({}), 1)
        self.assertEqual(await self.db.questions.count_documents({}), 0)


if __name__ == "__main__":
    unittest.main()
