from fastapi import APIRouter, Depends

from app.controllers import profile_controller
from app.core.dependencies import get_current_user
from app.schemas.profile import ProfileData, ProfileRead

router = APIRouter(prefix="/users/me/profile", tags=["profile"])


@router.get("", response_model=ProfileRead | None)
async def my_profile(user: dict = Depends(get_current_user)):
    """Perfil do usuário logado, ou `null` se ainda não preencheu."""
    return await profile_controller.get_profile(user)


@router.put("", response_model=ProfileData)
async def save_my_profile(data: ProfileData, user: dict = Depends(get_current_user)):
    return await profile_controller.save_profile(user, data)
