"""Limpeza manual de imagens órfãs (o backend já faz isso sozinho; veja app/core/image_cleanup.py).

cd back && .venv/bin/python -m scripts.cleanup_images            # só lista (simulação)
cd back && .venv/bin/python -m scripts.cleanup_images --apply    # apaga de verdade
Arquivos mais novos que --min-age-hours são preservados: podem ser uploads
de quem ainda está editando o perfil ou a pergunta e não salvou.
"""
import argparse
import asyncio

from app.core import image_cleanup
from app.core.config import settings
from app.core.database import client


async def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--apply", action="store_true", help="Apaga os órfãos; sem isso, só lista.")
    parser.add_argument("--min-age-hours", type=float, default=settings.image_cleanup_min_age_hours,
                        help="Idade mínima para apagar (padrão: IMAGE_CLEANUP_MIN_AGE_HOURS).")
    args = parser.parse_args()
    try:
        try:
            result = await image_cleanup.scan(args.min_age_hours)
        except RuntimeError as exc:
            raise SystemExit(str(exc))
        for url in result.orphans:
            print(url)
        print(f"{result.total} arquivos, {result.in_use} em uso, "
              f"{result.recent} órfãos recentes preservados, {len(result.orphans)} órfãos para apagar.")
        if not args.apply:
            if result.orphans:
                print("Simulação: nada foi apagado. Rode com --apply para apagar.")
            return
        await image_cleanup.delete(result.orphans)
        print(f"{len(result.orphans)} órfãos enviados para exclusão (falhas aparecem acima, no log).")
    finally:
        await client.close()


if __name__ == "__main__":
    asyncio.run(main())
