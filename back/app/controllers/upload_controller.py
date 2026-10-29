import io
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError

import httpx

from app.core import storage
from app.core.config import settings
from app.models.question import QuestionModel
from app.models.user import UserModel
from app.schemas.upload import UploadResponse

UPLOAD_DIR = Path(settings.upload_dir)
_CHUNK = 64 * 1024
_MIME = {".png": "image/png", ".jpg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp"}

# O tipo é decidido pelo conteúdo (assinatura do arquivo), não pelo nome/Content-Type enviados.
def _detect_extension(head: bytes) -> str | None:
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if head.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if head.startswith((b"GIF87a", b"GIF89a")):
        return ".gif"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return ".webp"
    return None


def _check_dimensions(source, min_side: int) -> None:
    try:
        with Image.open(source) as img:
            width, height = img.size
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Imagem inválida ou corrompida")
    if min(width, height) < min_side:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Foto muito pequena ({width}x{height}). Mínimo: {min_side}x{min_side} px",
        )


async def save_image(file: UploadFile, min_side: int = 0) -> UploadResponse:
    max_bytes = settings.max_upload_mb * 1024 * 1024
    head = await file.read(12)
    ext = _detect_extension(head)
    if not ext:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Envie uma imagem PNG, JPEG, GIF ou WebP"
        )

    if storage.supabase_enabled():
        return await _save_remote(file, head, ext, max_bytes, min_side)

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    path = UPLOAD_DIR / f"{uuid.uuid4().hex}{ext}"
    size = len(head)
    try:
        with path.open("wb") as out:
            out.write(head)
            while chunk := await file.read(_CHUNK):
                size += len(chunk)
                if size > max_bytes:
                    raise HTTPException(
                        status.HTTP_413_CONTENT_TOO_LARGE,
                        f"Imagem maior que {settings.max_upload_mb} MB",
                    )
                out.write(chunk)
        if min_side:
            _check_dimensions(path, min_side)
    except BaseException:
        path.unlink(missing_ok=True)
        raise
    return UploadResponse(url=f"/uploads/{path.name}")


async def discard_images(urls) -> None:
    """Apaga do storage as imagens descartadas que nenhum perfil ou pergunta usa mais."""
    urls = list(set(urls))
    if not urls:
        return
    in_use = await UserModel.photos_in_use(urls) | await QuestionModel.images_in_use(urls)
    await storage.delete_objects(u for u in urls if u not in in_use)


async def _save_remote(file: UploadFile, head: bytes, ext: str, max_bytes: int, min_side: int) -> UploadResponse:
    chunks, size = [head], len(head)
    while chunk := await file.read(_CHUNK):
        size += len(chunk)
        if size > max_bytes:
            raise HTTPException(
                status.HTTP_413_CONTENT_TOO_LARGE, f"Imagem maior que {settings.max_upload_mb} MB"
            )
        chunks.append(chunk)
    data = b"".join(chunks)
    if min_side:
        _check_dimensions(io.BytesIO(data), min_side)
    try:
        url = await storage.upload_object(f"{uuid.uuid4().hex}{ext}", data, _MIME[ext])
    except httpx.HTTPError:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Falha ao armazenar a imagem")
    return UploadResponse(url=url)
