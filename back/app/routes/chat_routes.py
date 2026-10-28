import asyncio
import time
from collections import deque

import jwt
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status

from app.controllers import chat_controller
from app.core import security
from app.core.dependencies import require_roles
from app.core.roles import Role
from app.core.ws_manager import manager
from app.models.refresh_token import RefreshTokenModel
from app.models.user import UserModel
from app.schemas.chat import ConversationOut, HistoryOut

router = APIRouter(tags=["chat"])

only_users = require_roles(Role.USER)

AUTH_TIMEOUT = 5  # segundos para o cliente enviar o token depois de conectar
RATE_LIMIT = 15  # mensagens por janela, por conexão
RATE_WINDOW = 10  # segundos

# Códigos de fechamento (faixa 4000-4999 é livre para a aplicação)
CLOSE_UNAUTHORIZED = 4401
CLOSE_FORBIDDEN = 4403


@router.get("/conversations", response_model=list[ConversationOut])
async def conversations(user: dict = Depends(only_users)):
    """Matches com a última mensagem e a quantidade de não lidas."""
    return await chat_controller.conversations(user)


@router.get("/conversations/{user_id}/messages", response_model=HistoryOut)
async def history(
    user_id: str,
    before: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    user: dict = Depends(only_users),
):
    """Histórico paginado: passe em `before` o id da mensagem mais antiga que você já tem."""
    return await chat_controller.history(user, user_id, before, limit)


@router.post("/conversations/{user_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_read(user_id: str, user: dict = Depends(only_users)):
    await chat_controller.mark_read(user, user_id)


async def _close(ws: WebSocket, code: int) -> None:
    try:
        await ws.close(code=code)
    except RuntimeError:  # já estava fechado
        pass


async def _authenticate(ws: WebSocket) -> tuple[dict, str] | None:
    """A primeira mensagem deve ser {"type": "auth", "token": <access token>}.

    O token não vai na URL para não aparecer em logs e no histórico do navegador.
    """
    try:
        data = await asyncio.wait_for(ws.receive_json(), timeout=AUTH_TIMEOUT)
        if data.get("type") != "auth":
            raise ValueError
        payload = security.decode_token(data["token"], "access")
        sid = payload["sid"]
        # a sessão do token precisa estar viva (logout/troca de senha a encerram)
        if not await RefreshTokenModel.session_active(sid):
            raise ValueError
        user = await UserModel.find_by_id(payload["sub"])
    except (asyncio.TimeoutError, ValueError, KeyError, TypeError, AttributeError, jwt.InvalidTokenError):
        await _close(ws, CLOSE_UNAUTHORIZED)
        return None
    except WebSocketDisconnect:
        return None
    if not user or user.get("suspended") or user.get("role") == Role.ADMIN.value:
        await _close(ws, CLOSE_FORBIDDEN)
        return None
    return user, sid


async def _handle(user: dict, data: object, recent: deque) -> None:
    """Processa um comando do cliente; levanta HTTPException para virar um evento de erro."""
    if not isinstance(data, dict) or data.get("type") != "message":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Comando inválido")

    now = time.monotonic()
    while recent and now - recent[0] > RATE_WINDOW:
        recent.popleft()
    if len(recent) >= RATE_LIMIT:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Muitas mensagens em pouco tempo")
    recent.append(now)

    message = await chat_controller.send_message(user, str(data.get("to", "")), str(data.get("text", "")))
    event = {"type": "message", "message": message.model_dump(mode="json")}
    await manager.send_to_user(message.recipient_id, event)
    # quem enviou (todas as abas) recebe o eco; o client_id deixa a aba de origem
    # trocar a mensagem otimista pela definitiva
    client_id = data.get("client_id")
    echo = message.model_copy(update={"client_id": str(client_id)[:64] if client_id else None})
    await manager.send_to_user(message.sender_id, {"type": "message", "message": echo.model_dump(mode="json")})


@router.websocket("/ws")
async def chat_socket(ws: WebSocket):
    await ws.accept()
    authenticated = await _authenticate(ws)
    if authenticated is None:
        return
    user, sid = authenticated
    user_id = str(user["_id"])
    manager.add(user_id, ws, sid)
    recent: deque = deque()
    try:
        await ws.send_json({"type": "ready"})
        while True:
            try:
                data = await ws.receive_json()
            except ValueError:  # JSON inválido
                await ws.send_json({"type": "error", "detail": "Mensagem inválida"})
                continue
            # confere a cada comando: a sessão pode ter sido encerrada ou a conta suspensa
            if not await RefreshTokenModel.session_active(sid):
                await _close(ws, CLOSE_UNAUTHORIZED)
                return
            user = await UserModel.find_by_id(user_id)
            if not user or user.get("suspended"):
                await _close(ws, CLOSE_FORBIDDEN)
                return
            try:
                await _handle(user, data, recent)
            except HTTPException as exc:
                client_id = data.get("client_id") if isinstance(data, dict) else None
                await ws.send_json({"type": "error", "detail": exc.detail, "client_id": client_id})
    except WebSocketDisconnect:
        pass
    finally:
        manager.remove(user_id, ws)
