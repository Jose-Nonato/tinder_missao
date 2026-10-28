from fastapi import APIRouter, Depends

from app.controllers import answer_controller, user_controller
from app.core.dependencies import get_current_user, require_roles
from app.core.roles import Role
from app.schemas.answer import AnswersRequest, AnswersResponse
from app.schemas.auth import UserResponse
from app.schemas.user import UpdateRoleRequest

router = APIRouter(prefix="/users", tags=["users"])

admin_only = require_roles(Role.ADMIN)


@router.get("", response_model=list[UserResponse])
async def list_users(_: dict = Depends(admin_only)):
    return await user_controller.list_users()


@router.patch("/{user_id}/role", response_model=UserResponse)
async def update_role(
    user_id: str, data: UpdateRoleRequest, admin: dict = Depends(admin_only)
):
    return await user_controller.update_role(user_id, data.role, admin)


@router.get("/me/answers", response_model=AnswersResponse)
async def my_answers(user: dict = Depends(get_current_user)):
    return await answer_controller.get_answers(user)


@router.put("/me/answers", response_model=AnswersResponse)
async def save_my_answers(data: AnswersRequest, user: dict = Depends(get_current_user)):
    return await answer_controller.save_answers(user, data)
