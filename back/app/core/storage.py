import logging
from pathlib import Path

import httpx

from app.core.config import settings

LOCAL_PREFIX = "/uploads/"

log = logging.getLogger(__name__)


def supabase_enabled() -> bool:
    return bool(settings.supabase_url and settings.supabase_service_key)


def _base() -> str:
    return f"{settings.supabase_url.rstrip('/')}/storage/v1/object"


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.supabase_service_key}",
        "apikey": settings.supabase_service_key,
    }


def public_prefix() -> str:
    return f"{_base()}/public/{settings.supabase_bucket}/"


def public_url(name: str) -> str:
    return public_prefix() + name


def object_name(url: str, prefix: str) -> str | None:
    name = url.removeprefix(prefix)
    if name == url or not name or "/" in name or "\\" in name or ".." in name:
        return None
    return name


async def upload_object(name: str, data: bytes, content_type: str) -> str:
    """Envia o arquivo ao bucket do Supabase e devolve a URL pública."""
    headers = {**_headers(), "Content-Type": content_type, "Cache-Control": "max-age=31536000"}
    async with httpx.AsyncClient(timeout=30) as http:
        res = await http.post(f"{_base()}/{settings.supabase_bucket}/{name}", content=data, headers=headers)
    res.raise_for_status()
    return public_url(name)


async def list_objects(page: int = 1000) -> list[dict]:
    """Arquivos na raiz do bucket (name, created_at...); subpastas ficam de fora."""
    objects, offset = [], 0
    async with httpx.AsyncClient(timeout=30) as http:
        while True:
            res = await http.post(
                f"{_base()}/list/{settings.supabase_bucket}",
                json={"prefix": "", "limit": page, "offset": offset, "sortBy": {"column": "name", "order": "asc"}},
                headers=_headers(),
            )
            res.raise_for_status()
            batch = res.json()
            objects += [o for o in batch if o.get("id")]  # pastas vêm com id nulo
            if len(batch) < page:
                return objects
            offset += page


async def delete_objects(urls) -> None:
    """Apaga arquivos enviados pelo sistema (bucket ou /uploads). URLs externas são ignoradas.

    Falhas só são registradas: um arquivo que sobrar não deve impedir a operação que o descartou.
    """
    remote = []
    for url in set(urls):
        if supabase_enabled() and (name := object_name(url, public_prefix())):
            remote.append(name)
        elif name := object_name(url, LOCAL_PREFIX):
            try:
                (Path(settings.upload_dir) / name).unlink(missing_ok=True)
            except OSError:
                log.exception("Falha ao apagar o arquivo local %s", name)
    if not remote:
        return
    try:
        async with httpx.AsyncClient(timeout=30) as http:
            res = await http.request(
                "DELETE",
                f"{_base()}/{settings.supabase_bucket}",
                json={"prefixes": remote},
                headers=_headers(),
            )
        res.raise_for_status()
    except httpx.HTTPError:
        log.exception("Falha ao apagar do bucket: %s", remote)
