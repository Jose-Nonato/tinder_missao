from datetime import date

from bson import ObjectId
from fastapi import HTTPException, status

from app.controllers.safety_controller import validate_target
from app.core.age import age_on
from app.core.ws_manager import manager
from app.models.refresh_token import RefreshTokenModel
from app.models.report import ReportModel
from app.models.user import UserModel
from app.schemas.safety import (
    ReportDetail,
    ReportedProfile,
    ReportHistoryItem,
    ReportReason,
    ReportResponse,
    ReportStatus,
    ReportStatusUpdate,
    ReportSummary,
    SuspensionResult,
    UserRef,
)

_REPORT_NOT_FOUND = "Denúncia não encontrada"


def _ref(users: dict, oid) -> UserRef:
    return UserRef(id=str(oid), username=users.get(oid, {}).get("username", "(removido)"))


async def _users_for(docs: list[dict]) -> dict:
    ids = {d["reporter_id"] for d in docs} | {d["reported_id"] for d in docs}
    ids |= {d["resolved_by"] for d in docs if d.get("resolved_by")}
    return {u["_id"]: u for u in await UserModel.find_many(list(ids))}


async def _to_response(docs: list[dict]) -> list[ReportResponse]:
    users = await _users_for(docs)
    totals = {rid: await ReportModel.count_against(rid) for rid in {d["reported_id"] for d in docs}}
    return [
        ReportResponse(
            id=str(d["_id"]),
            reporter=_ref(users, d["reporter_id"]),
            reported=_ref(users, d["reported_id"]),
            reason=d["reason"],
            details=d["details"],
            status=d["status"],
            reports_against_user=totals[d["reported_id"]],
            reported_suspended=bool(users.get(d["reported_id"], {}).get("suspended")),
            resolution_note=d.get("resolution_note", ""),
            resolved_by=_ref(users, d["resolved_by"]) if d.get("resolved_by") else None,
            resolved_at=d.get("resolved_at"),
            created_at=d["created_at"],
        )
        for d in docs
    ]


async def list_reports(
    report_status: ReportStatus | None, reason: ReportReason | None
) -> list[ReportResponse]:
    docs = await ReportModel.list(
        report_status.value if report_status else None, reason.value if reason else None
    )
    return await _to_response(docs)


async def summary() -> ReportSummary:
    return ReportSummary(**await ReportModel.summary())


async def get_report(report_id: str) -> ReportDetail:
    doc = await ReportModel.get(report_id)
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, _REPORT_NOT_FOUND)
    base = (await _to_response([doc]))[0]

    reported = await UserModel.find_by_id(str(doc["reported_id"]))
    profile = None
    if reported and reported.get("profile"):
        p = reported["profile"]
        profile = ReportedProfile(
            age=age_on(date.fromisoformat(p["birth_date"])) if p.get("birth_date") else None,
            gender=p.get("gender"),
            photos=p.get("photos", []),
            description=p.get("description", ""),
            profession=p.get("profession", ""),
            university=p.get("university", ""),
            city=p.get("city", ""),
            state=p.get("state", ""),
            country=p.get("country", ""),
        )

    others = await ReportModel.history_for(doc["reported_id"], doc["_id"])
    users = await _users_for(others)
    history = [
        ReportHistoryItem(
            id=str(o["_id"]),
            reporter=_ref(users, o["reporter_id"]),
            reason=o["reason"],
            details=o["details"],
            status=o["status"],
            created_at=o["created_at"],
        )
        for o in others
    ]
    return ReportDetail(
        **base.model_dump(),
        reported_profile=profile,
        suspended_reason=(reported or {}).get("suspended_reason", ""),
        history=history,
    )


async def update_report_status(admin: dict, report_id: str, data: ReportStatusUpdate) -> ReportResponse:
    doc = await ReportModel.set_resolution(report_id, data.status.value, data.note, admin["_id"])
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, _REPORT_NOT_FOUND)
    return (await _to_response([doc]))[0]


async def suspend_user(admin: dict, user_id: str, reason: str) -> SuspensionResult:
    """Suspende a conta, derruba as sessões e encerra as denúncias abertas contra ela."""
    oid: ObjectId = await validate_target(admin, user_id)
    await UserModel.suspend(oid, reason, admin["_id"])
    await RefreshTokenModel.delete_for_user(str(oid))
    await manager.close(str(oid), code=4403)  # derruba o chat aberto da pessoa
    closed = await ReportModel.close_open_for_user(oid, admin["_id"], f"Conta suspensa: {reason}")
    return SuspensionResult(suspended=True, closed_reports=closed)


async def reactivate_user(admin: dict, user_id: str) -> SuspensionResult:
    oid: ObjectId = await validate_target(admin, user_id)
    await UserModel.unsuspend(oid)
    return SuspensionResult(suspended=False, closed_reports=0)
