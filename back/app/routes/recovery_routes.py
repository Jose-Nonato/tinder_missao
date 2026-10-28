from fastapi import APIRouter, Depends

from app.controllers import recovery_controller
from app.core.dependencies import require_roles
from app.core.roles import Role
from app.schemas.recovery import (
    IssuedResetToken,
    PasswordResetRequestOut,
    RecoveryStatus,
    RecoverySummary,
)

router = APIRouter(prefix="/password-resets", tags=["account-recovery"])

admin_only = require_roles(Role.ADMIN)


@router.get("", response_model=list[PasswordResetRequestOut])
async def list_requests(status: RecoveryStatus | None = None, _: dict = Depends(admin_only)):
    """Pedidos de "esqueci minha senha" feitos pelos usuários."""
    return await recovery_controller.list_requests(status)


# Declarada antes de "/{request_id}/..." para não ser capturada por ele.
@router.get("/summary", response_model=RecoverySummary)
async def summary(_: dict = Depends(admin_only)):
    return await recovery_controller.summary()


@router.post("/{request_id}/issue", response_model=IssuedResetToken)
async def issue_token(request_id: str, admin: dict = Depends(admin_only)):
    """Gera o link de uso único. Confirme a identidade da pessoa por fora antes de entregá-lo."""
    return await recovery_controller.issue_token(admin, request_id)


@router.post("/{request_id}/dismiss", response_model=PasswordResetRequestOut)
async def dismiss(request_id: str, admin: dict = Depends(admin_only)):
    return await recovery_controller.dismiss(admin, request_id)
