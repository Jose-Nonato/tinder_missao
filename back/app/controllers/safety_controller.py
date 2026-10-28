from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException, status

from app.core.roles import Role
from app.models.block import BlockModel
from app.models.report import ReportModel
from app.models.user import UserModel
from app.schemas.safety import BlockedUser, ReportRequest

_NOT_FOUND = "Usuário não encontrado"


async def validate_target(user: dict, user_id: str) -> ObjectId:
    """Valida a pessoa-alvo (bloquear/denunciar): existe, é usuária comum e não é você."""
    try:
        oid = ObjectId(user_id)
    except (InvalidId, TypeError):
        raise HTTPException(status.HTTP_404_NOT_FOUND, _NOT_FOUND)
    if oid == user["_id"]:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Você não pode fazer isso consigo mesmo")
    target = await UserModel.find_by_id(user_id)
    if not target or target.get("role") == Role.ADMIN.value:
        raise HTTPException(status.HTTP_404_NOT_FOUND, _NOT_FOUND)
    return oid


async def block(user: dict, user_id: str) -> None:
    await BlockModel.add(user["_id"], await validate_target(user, user_id))


async def unblock(user: dict, user_id: str) -> None:
    try:
        oid = ObjectId(user_id)
    except (InvalidId, TypeError):
        raise HTTPException(status.HTTP_404_NOT_FOUND, _NOT_FOUND)
    if not await BlockModel.remove(user["_id"], oid):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Esse usuário não está bloqueado")


async def list_blocked(user: dict) -> list[BlockedUser]:
    blocks = await BlockModel.blocked_by(user["_id"])
    users = {u["_id"]: u for u in await UserModel.find_many([b["blocked_id"] for b in blocks])}
    result = []
    for b in blocks:
        other = users.get(b["blocked_id"])
        if other:
            photos = (other.get("profile") or {}).get("photos") or []
            result.append(
                BlockedUser(
                    id=str(other["_id"]),
                    username=other["username"],
                    photo=photos[0] if photos else None,
                    blocked_at=b["created_at"],
                )
            )
    return result


async def report(user: dict, data: ReportRequest) -> None:
    oid = await validate_target(user, data.user_id)
    if await ReportModel.has_open(user["_id"], oid):
        raise HTTPException(status.HTTP_409_CONFLICT, "Você já denunciou este usuário")
    await ReportModel.create(user["_id"], oid, data.reason.value, data.details)
    if data.block:
        await BlockModel.add(user["_id"], oid)
