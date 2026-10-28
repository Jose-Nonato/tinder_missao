import secrets

from fastapi import HTTPException, status

from app.core.config import settings
from app.core.roles import Role
from app.models.password_reset import PasswordResetModel
from app.models.password_reset_request import PasswordResetRequestModel
from app.models.user import UserModel
from app.schemas.recovery import (
    IssuedResetToken,
    PasswordResetRequestOut,
    RecoveryStatus,
    RecoverySummary,
)
from app.schemas.safety import UserRef

_NOT_FOUND = "Pedido não encontrado"


async def _to_out(docs: list[dict]) -> list[PasswordResetRequestOut]:
    ids = {d["user_id"] for d in docs} | {d["issued_by"] for d in docs if d.get("issued_by")}
    users = {u["_id"]: u for u in await UserModel.find_many(list(ids))}

    def ref(oid) -> UserRef:
        return UserRef(id=str(oid), username=users.get(oid, {}).get("username", "(removido)"))

    result = []
    for d in docs:
        owner = await UserModel.find_by_id(str(d["user_id"]))  # precisa do created_at
        result.append(
            PasswordResetRequestOut(
                id=str(d["_id"]),
                user=ref(d["user_id"]),
                email=d["email"],
                contact=d.get("contact", ""),
                status=d["status"],
                requested_at=d["requested_at"],
                account_created_at=owner.get("created_at") if owner else None,
                issued_by=ref(d["issued_by"]) if d.get("issued_by") else None,
                issued_at=d.get("issued_at"),
                completed_at=d.get("completed_at"),
            )
        )
    return result


async def list_requests(request_status: RecoveryStatus | None) -> list[PasswordResetRequestOut]:
    docs = await PasswordResetRequestModel.list(request_status.value if request_status else None)
    return await _to_out(docs)


async def summary() -> RecoverySummary:
    return RecoverySummary(**await PasswordResetRequestModel.summary())


async def _open_request(request_id: str) -> dict:
    doc = await PasswordResetRequestModel.get(request_id)
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, _NOT_FOUND)
    if doc["status"] not in ("pending", "issued"):
        raise HTTPException(status.HTTP_409_CONFLICT, "Este pedido já foi encerrado")
    return doc


async def issue_token(admin: dict, request_id: str) -> IssuedResetToken:
    """Gera o token de redefinição; gerar de novo invalida o anterior."""
    doc = await _open_request(request_id)
    user = await UserModel.find_by_id(str(doc["user_id"]))
    if not user or user.get("suspended") or user.get("role") == Role.ADMIN.value:
        raise HTTPException(status.HTTP_409_CONFLICT, "Não é possível redefinir a senha desta conta")
    token = secrets.token_urlsafe(32)
    expires_at = await PasswordResetModel.create(
        user["_id"], token, settings.reset_token_minutes, request_id=doc["_id"]
    )
    await PasswordResetRequestModel.mark_issued(doc["_id"], admin["_id"])
    return IssuedResetToken(token=token, expires_at=expires_at)


async def dismiss(admin: dict, request_id: str) -> PasswordResetRequestOut:
    doc = await _open_request(request_id)
    await PasswordResetModel.delete_for_user(doc["user_id"])  # um link já gerado também deixa de valer
    updated = await PasswordResetRequestModel.dismiss(doc["_id"], admin["_id"])
    return (await _to_out([updated]))[0]
