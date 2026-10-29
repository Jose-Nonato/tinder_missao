from fastapi import APIRouter, Depends, UploadFile, status

from app.controllers import upload_controller
from app.core.config import settings
from app.core.dependencies import get_current_user, require_roles
from app.core.roles import Role
from app.schemas.upload import UploadDiscard, UploadResponse

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_image(file: UploadFile, _: dict = Depends(require_roles(Role.ADMIN))):
    """Envia uma imagem (multipart, campo `file`) e devolve a URL relativa para guardar."""
    return await upload_controller.save_image(file)


@router.post("/photos", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_photo(file: UploadFile, _: dict = Depends(get_current_user)):
    """Foto de perfil: qualquer usuário logado; exige lado mínimo em pixels."""
    return await upload_controller.save_image(file, min_side=settings.min_photo_px)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def discard_upload(data: UploadDiscard, _: dict = Depends(get_current_user)):
    """Descarta uma imagem enviada e tirada do formulário antes de salvar.

    Só apaga se nenhum perfil ou pergunta salvos a usam; as já salvas saem ao salvar a alteração.
    """
    await upload_controller.discard_images([data.url])
