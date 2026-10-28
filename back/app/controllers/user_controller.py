from fastapi import HTTPException, status

from app.core.roles import Role
from app.models.user import UserModel
from app.schemas.auth import UserResponse


async def list_users() -> list[UserResponse]:
    return [UserResponse.from_doc(u) for u in await UserModel.list_all()]


async def update_role(user_id: str, role: Role, acting_user: dict) -> UserResponse:
    if str(acting_user["_id"]) == user_id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Você não pode alterar o seu próprio papel"
        )
    user = await UserModel.update_role(user_id, role)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuário não encontrado")
    return UserResponse.from_doc(user)
