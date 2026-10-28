from fastapi import APIRouter, Depends, status

from app.controllers import safety_controller
from app.core.dependencies import require_roles
from app.core.roles import Role
from app.schemas.safety import BlockedUser, BlockRequest, ReportRequest

router = APIRouter(tags=["safety"])

only_users = require_roles(Role.USER)


@router.post("/blocks", status_code=status.HTTP_204_NO_CONTENT)
async def block_user(data: BlockRequest, user: dict = Depends(only_users)):
    """Bloqueia: vocês dois deixam de aparecer um para o outro (baralho e matches)."""
    await safety_controller.block(user, data.user_id)


@router.get("/blocks", response_model=list[BlockedUser])
async def blocked_users(user: dict = Depends(only_users)):
    return await safety_controller.list_blocked(user)


@router.delete("/blocks/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unblock_user(user_id: str, user: dict = Depends(only_users)):
    await safety_controller.unblock(user, user_id)


@router.post("/reports", status_code=status.HTTP_204_NO_CONTENT)
async def report_user(data: ReportRequest, user: dict = Depends(only_users)):
    """Denuncia um usuário para os administradores (e, por padrão, também o bloqueia)."""
    await safety_controller.report(user, data)
