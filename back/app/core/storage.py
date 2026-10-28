import httpx

from app.core.config import settings

LOCAL_PREFIX = "/uploads/"


def supabase_enabled() -> bool:
    return bool(settings.supabase_url and settings.supabase_service_key)


def _base() -> str:
    return f"{settings.supabase_url.rstrip('/')}/storage/v1/object"


def public_prefix() -> str:
    return f"{_base()}/public/{settings.supabase_bucket}/"


def public_url(name: str) -> str:
    return public_prefix() + name


async def upload_object(name: str, data: bytes, content_type: str) -> str:
    """Envia o arquivo ao bucket do Supabase e devolve a URL pública."""
    headers = {
        "Authorization": f"Bearer {settings.supabase_service_key}",
        "apikey": settings.supabase_service_key,
        "Content-Type": content_type,
        "Cache-Control": "max-age=31536000",
    }
    async with httpx.AsyncClient(timeout=30) as http:
        res = await http.post(f"{_base()}/{settings.supabase_bucket}/{name}", content=data, headers=headers)
    res.raise_for_status()
    return public_url(name)
