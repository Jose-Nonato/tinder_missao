from fastapi import APIRouter, Depends, Query

from app.controllers import match_controller
from app.core.dependencies import require_roles
from app.core.roles import Role
from app.schemas.match import MatchResponse, RecommendationsResponse, SwipeRequest, SwipeResponse

router = APIRouter(tags=["matches"])

# Recurso de usuários comuns (admins só gerenciam o sistema)
only_users = require_roles(Role.USER)


@router.get("/recommendations", response_model=RecommendationsResponse)
async def recommendations(
    limit: int = Query(default=20, ge=1, le=50), user: dict = Depends(only_users)
):
    """Perfis ainda não avaliados, do mais para o menos compatível; se vier vazio, explica o motivo."""
    return await match_controller.recommendations(user, limit)


@router.post("/swipes", response_model=SwipeResponse)
async def swipe(data: SwipeRequest, user: dict = Depends(only_users)):
    """Curte (`like`) ou descarta (`pass`) um perfil; `matched` indica curtida mútua."""
    return await match_controller.swipe(user, data)


@router.get("/matches", response_model=list[MatchResponse])
async def matches(user: dict = Depends(only_users)):
    return await match_controller.matches(user)
