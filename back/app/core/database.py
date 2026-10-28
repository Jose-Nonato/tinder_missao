from pymongo import AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase

from app.core.config import settings

# tz_aware: o Mongo guarda datas em UTC; sem isso elas voltam "sem fuso" e o navegador
# as interpretaria como horário local.
client: AsyncMongoClient = AsyncMongoClient(settings.mongodb_url, tz_aware=True)


def get_db() -> AsyncDatabase:
    return client[settings.mongodb_db]


async def init_indexes() -> None:
    db = get_db()
    await db.users.create_index("email", unique=True)
    await db.users.create_index("username", unique=True)
    await db.questions.create_index("code", unique=True)
    await db.swipes.create_index([("from_id", 1), ("to_id", 1)], unique=True)
    await db.swipes.create_index([("to_id", 1), ("action", 1)])
    await db.blocks.create_index([("blocker_id", 1), ("blocked_id", 1)], unique=True)
    await db.blocks.create_index("blocked_id")
    await db.reports.create_index([("status", 1), ("created_at", -1)])
    await db.reports.create_index([("reporter_id", 1), ("reported_id", 1)])
    await db.messages.create_index([("pair", 1), ("_id", -1)])
    await db.messages.create_index([("recipient_id", 1), ("sender_id", 1), ("read_at", 1)])
    await db.refresh_tokens.create_index("jti", unique=True)
    await db.refresh_tokens.create_index("sid")
    await db.refresh_tokens.create_index("user_id")
    await db.password_resets.create_index("token_hash", unique=True)
    await db.password_resets.create_index("expires_at", expireAfterSeconds=0)
    await db.rate_limits.create_index("expires_at", expireAfterSeconds=0)
    await db.password_reset_requests.create_index([("status", 1), ("requested_at", -1)])
    await db.password_reset_requests.create_index("user_id")
    # expira automaticamente os refresh tokens vencidos
    await db.refresh_tokens.create_index("expires_at", expireAfterSeconds=0)
