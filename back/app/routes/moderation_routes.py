from fastapi import APIRouter, Depends

from app.controllers import moderation_controller
from app.core.dependencies import require_roles
from app.core.roles import Role
from app.schemas.safety import (
    ReportDetail,
    ReportReason,
    ReportResponse,
    ReportStatus,
    ReportStatusUpdate,
    ReportSummary,
    SuspensionRequest,
    SuspensionResult,
)

router = APIRouter(tags=["moderation"])

admin_only = require_roles(Role.ADMIN)


@router.get("/reports", response_model=list[ReportResponse])
async def list_reports(
    status: ReportStatus | None = None,
    reason: ReportReason | None = None,
    _: dict = Depends(admin_only),
):
    return await moderation_controller.list_reports(status, reason)


# Declarada antes de "/reports/{report_id}" para não ser capturada por ele.
@router.get("/reports/summary", response_model=ReportSummary)
async def reports_summary(_: dict = Depends(admin_only)):
    return await moderation_controller.summary()


@router.get("/reports/{report_id}", response_model=ReportDetail)
async def report_detail(report_id: str, _: dict = Depends(admin_only)):
    """Denúncia + perfil denunciado + outras denúncias contra a mesma pessoa."""
    return await moderation_controller.get_report(report_id)


@router.patch("/reports/{report_id}", response_model=ReportResponse)
async def update_report(
    report_id: str, data: ReportStatusUpdate, admin: dict = Depends(admin_only)
):
    return await moderation_controller.update_report_status(admin, report_id, data)


@router.post("/users/{user_id}/suspension", response_model=SuspensionResult)
async def suspend_user(
    user_id: str, data: SuspensionRequest, admin: dict = Depends(admin_only)
):
    """Suspende a conta (sem login, fora do baralho) e resolve as denúncias abertas contra ela."""
    return await moderation_controller.suspend_user(admin, user_id, data.reason)


@router.delete("/users/{user_id}/suspension", response_model=SuspensionResult)
async def reactivate_user(user_id: str, admin: dict = Depends(admin_only)):
    return await moderation_controller.reactivate_user(admin, user_id)
