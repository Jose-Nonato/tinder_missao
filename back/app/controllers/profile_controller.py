from fastapi import HTTPException, status

from app.controllers.upload_controller import UPLOAD_DIR, discard_images
from app.models.user import UserModel
from app.schemas.profile import ProfileData, ProfileRead


async def get_profile(user: dict) -> ProfileRead | None:
    profile = user.get("profile")
    return ProfileRead.model_validate(profile) if profile else None


async def save_profile(user: dict, data: ProfileData) -> ProfileData:
    for url in data.photos:
        if url.startswith("http"):
            continue  # já validado como URL do bucket no schema
        if not (UPLOAD_DIR / url.removeprefix("/uploads/")).is_file():
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY, f"Foto não encontrada: {url}"
            )
    await UserModel.save_profile(user["_id"], data.model_dump(mode="json"))
    old = (user.get("profile") or {}).get("photos") or []
    await discard_images(set(old) - set(data.photos))
    return data
