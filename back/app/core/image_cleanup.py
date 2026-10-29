"""Limpeza de imagens órfãs: arquivos no bucket (ou em /uploads) que nenhum perfil ou pergunta usa.

Trocar foto ou editar/excluir pergunta já apaga a imagem na hora; esta limpeza recolhe o resto,
como uploads que nunca foram salvos. Roda sozinha no backend e também por scripts.cleanup_images.
"""
import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path

from pymongo.errors import DuplicateKeyError

from app.core import storage
from app.core.config import settings
from app.core.database import get_db
from app.models.question import image_urls

JOB_ID = "image_cleanup"
_BATCH = 500

log = logging.getLogger("uvicorn.error")  # aparece junto do log do servidor


@dataclass
class Scan:
    total: int = 0
    in_use: int = 0
    recent: int = 0  # órfãos novos demais: podem ser de quem ainda não salvou
    orphans: list[str] = field(default_factory=list)


async def _referenced_urls(db) -> set[str]:
    urls = set()
    async for u in db.users.find({"profile.photos.0": {"$exists": True}}, {"profile.photos": 1}):
        urls.update(u["profile"]["photos"])
    async for q in db.questions.find({}, {"image": 1, "options": 1}):
        urls.update(image_urls(q))
    return urls


async def _remote_files() -> list[tuple[str, datetime]]:
    return [
        (storage.public_url(o["name"]), datetime.fromisoformat(o["created_at"].replace("Z", "+00:00")))
        for o in await storage.list_objects()
    ]


def _local_files() -> list[tuple[str, datetime]]:
    folder = Path(settings.upload_dir)
    if not folder.is_dir():
        return []
    return [
        (storage.LOCAL_PREFIX + p.name, datetime.fromtimestamp(p.stat().st_mtime, timezone.utc))
        for p in folder.iterdir()
        if p.is_file()
    ]


async def scan(min_age_hours: float) -> Scan:
    used = await _referenced_urls(get_db())
    files = _local_files() + (await _remote_files() if storage.supabase_enabled() else [])
    if files and not used:
        # banco vazio ou apontando para o lugar errado: melhor não apagar nada
        raise RuntimeError("Nenhuma imagem em uso no banco; limpeza cancelada (confira MONGODB_URL/MONGODB_DB).")
    cutoff = datetime.now(timezone.utc) - timedelta(hours=min_age_hours)
    result = Scan(total=len(files))
    for url, created in files:
        if url in used:
            result.in_use += 1
        elif created >= cutoff:
            result.recent += 1
        else:
            result.orphans.append(url)
    return result


async def delete(orphans: list[str]) -> None:
    for i in range(0, len(orphans), _BATCH):
        await storage.delete_objects(orphans[i:i + _BATCH])


async def _claim(interval: timedelta) -> bool:
    """Reserva a próxima execução no Mongo: com várias instâncias (ou reinícios), só uma roda por intervalo."""
    now = datetime.now(timezone.utc)
    jobs = get_db().jobs
    claimed = await jobs.update_one({"_id": JOB_ID, "next_run": {"$lte": now}}, {"$set": {"next_run": now + interval}})
    if claimed.modified_count:
        return True
    try:
        await jobs.insert_one({"_id": JOB_ID, "next_run": now + interval})
        return True
    except DuplicateKeyError:
        return False  # já existe e ainda não chegou a hora


async def run_periodically() -> None:
    interval = timedelta(hours=settings.image_cleanup_interval_hours)
    check = min(interval.total_seconds(), 15 * 60)
    while True:
        try:
            if await _claim(interval):
                result = await scan(settings.image_cleanup_min_age_hours)
                await delete(result.orphans)
                log.info("Limpeza de imagens: %d arquivos, %d órfãos apagados", result.total, len(result.orphans))
        except asyncio.CancelledError:
            raise
        except Exception:
            log.exception("Falha na limpeza de imagens órfãs")
        await asyncio.sleep(check)
