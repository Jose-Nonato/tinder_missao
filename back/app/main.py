from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.controllers.upload_controller import UPLOAD_DIR
from app.core.config import settings
from app.core.database import client, init_indexes
from app.core.seed import seed_admin
from app.routes import auth_routes, chat_routes, match_routes, moderation_routes, profile_routes, question_routes, recovery_routes, safety_routes, upload_routes, user_routes


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_indexes()
    await seed_admin()
    yield
    await client.close()


app = FastAPI(title="Tinder Missão API", lifespan=lifespan)
if settings.cors_origins:
    # Necessário quando o front fica em outro domínio (ex.: Vercel) e usa VITE_API_URL
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
        allow_methods=["*"],
        allow_headers=["*"],
    )
app.include_router(auth_routes.router)
app.include_router(user_routes.router)
app.include_router(question_routes.router)
app.include_router(match_routes.router)
app.include_router(profile_routes.router)
app.include_router(safety_routes.router)
app.include_router(chat_routes.router)
app.include_router(moderation_routes.router)
app.include_router(recovery_routes.router)
app.include_router(upload_routes.router)

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
# Serve os arquivos enviados em GET /uploads/<arquivo>. Registrado depois do router
# para que POST /uploads continue sendo tratado pela rota.
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
