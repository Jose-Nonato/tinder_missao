import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings
from app.schemas.upload import UploadResponse

UPLOAD_DIR = Path(settings.upload_dir)
_CHUNK = 64 * 1024

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


async def save_image(file: UploadFile) -> UploadResponse:
    max_bytes = settings.max_upload_mb * 1024 * 1024
    head = await file.read(12)
    ext = _detect_extension(head)
    if not ext:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Envie uma imagem PNG, JPEG, GIF ou WebP"
        )

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
    except BaseException:
        path.unlink(missing_ok=True)
        raise
    return UploadResponse(url=f"/uploads/{path.name}")
