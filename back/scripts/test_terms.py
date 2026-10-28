"""Consentimento no cadastro; persistência em banco temporário isolado."""
import unittest
from datetime import datetime, timezone
from unittest.mock import patch
from uuid import uuid4

from pydantic import ValidationError
from pymongo import AsyncMongoClient

from app.controllers.auth_controller import register
from app.core.config import settings
from app.schemas.auth import RegisterRequest, UserResponse

VERSION = "2026-10-28-draft-2"
BASE = dict(username="consent_test", email="consent@example.test", password="Test-only-123!")


class ConsentValidationTest(unittest.TestCase):
    def test_requires_explicit_boolean_and_current_version(self):
        for fields in ({}, {"accept_terms": False, "terms_version": VERSION},
                       {"accept_terms": "true", "terms_version": VERSION},
                       {"accept_terms": 1, "terms_version": VERSION},
                       {"accept_terms": True}, {"accept_terms": True, "terms_version": "old"}):
            with self.subTest(fields=fields), self.assertRaises(ValidationError):
                RegisterRequest(**BASE, **fields)

    def test_legacy_user_read_does_not_require_consent(self):
        user = UserResponse.from_doc({"_id": "legacy", **BASE, "created_at": datetime.now(timezone.utc)})
        self.assertIsNone(user.terms_accepted_at)
        self.assertIsNone(user.terms_version)


class ConsentPersistenceTest(unittest.IsolatedAsyncioTestCase):
    async def test_registration_records_server_timestamp_and_version(self):
        client = AsyncMongoClient(settings.mongodb_url, tz_aware=True, serverSelectionTimeoutMS=3000)
        db = client[f"terms_test_{uuid4().hex}"]
        try:
            before = datetime.now(timezone.utc)
            with patch("app.models.user.get_db", return_value=db):
                result = await register(RegisterRequest(**BASE, accept_terms=True, terms_version=VERSION,
                    terms_accepted_at="2000-01-01T00:00:00Z"))
            doc = await db.users.find_one({"username": BASE["username"]})
            self.assertEqual(doc["terms_version"], VERSION)
            self.assertGreaterEqual(doc["terms_accepted_at"].timestamp(), before.timestamp() - .001)
            self.assertLessEqual(doc["terms_accepted_at"], datetime.now(timezone.utc))
            self.assertEqual(doc["terms_accepted_at"].utcoffset().total_seconds(), 0)
            self.assertEqual(result.terms_version, VERSION)
            self.assertIsNotNone(result.terms_accepted_at)
        finally:
            await client.drop_database(db.name)
            await client.close()


if __name__ == "__main__":
    unittest.main()
