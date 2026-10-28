from datetime import date

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException, status

from app.core.age import age_on
from app.core.roles import Role
from app.core.ws_manager import manager
from app.models.block import BlockModel
from app.models.message import MessageModel
from app.models.swipe import SwipeModel
from app.models.user import UserModel
from app.schemas.chat import ChatUser, ConversationOut, HistoryOut, MessageOut

MAX_TEXT = 1000
_NOT_AVAILABLE = "Conversa indisponível"


async def _partner(user: dict, other_id: str) -> dict:
    """A outra pessoa da conversa, se ainda for possível conversar com ela.

    Exige match (curtida mútua) e que nenhum dos dois tenha bloqueado o outro nem esteja suspenso.
    """
    try:
        oid = ObjectId(other_id)
    except (InvalidId, TypeError):
        raise HTTPException(status.HTTP_404_NOT_FOUND, _NOT_AVAILABLE)
    other = await UserModel.find_by_id(other_id)
    if (
        not other
        or other.get("role") == Role.ADMIN.value
        or other.get("suspended")
        or oid in await BlockModel.hidden_ids(user["_id"])
        or not await SwipeModel.liked_me(user["_id"], oid)
        or not await SwipeModel.liked_me(oid, user["_id"])
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, _NOT_AVAILABLE)
    return other


def _chat_user(doc: dict) -> ChatUser:
    profile = doc.get("profile") or {}
    photos = profile.get("photos") or []
    birth = profile.get("birth_date")
    return ChatUser(
        id=str(doc["_id"]),
        username=doc["username"],
        photo=photos[0] if photos else None,
        age=age_on(date.fromisoformat(birth)) if birth else None,
    )


async def conversations(user: dict) -> list[ConversationOut]:
    hidden = await BlockModel.hidden_ids(user["_id"])
    found = [m for m in await SwipeModel.matches_of(user["_id"]) if m["user_id"] not in hidden]
    users = {u["_id"]: u for u in await UserModel.find_many([m["user_id"] for m in found])}
    result = []
    for m in found:
        other = users.get(m["user_id"])
        if not other or other.get("suspended"):
            continue
        last = await MessageModel.last_between(user["_id"], other["_id"])
        result.append(
            ConversationOut(
                user=_chat_user(other),
                last_message=MessageOut.from_doc(last) if last else None,
                unread=await MessageModel.unread_count(other["_id"], user["_id"]),
                matched_at=m["matched_at"],
            )
        )
    # mais recentes primeiro (última mensagem, ou o momento do match se ainda não conversaram)
    result.sort(key=lambda c: c.last_message.created_at if c.last_message else c.matched_at, reverse=True)
    return result


async def history(user: dict, other_id: str, before: str | None, limit: int) -> HistoryOut:
    other = await _partner(user, other_id)
    docs, has_more = await MessageModel.history(user["_id"], other["_id"], before, limit)
    return HistoryOut(messages=[MessageOut.from_doc(d) for d in docs], has_more=has_more)


async def send_message(sender: dict, to_id: str, text: str) -> MessageOut:
    text = text.strip()
    if not text or len(text) > MAX_TEXT:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, f"A mensagem deve ter de 1 a {MAX_TEXT} caracteres"
        )
    other = await _partner(sender, to_id)
    doc = await MessageModel.create(sender["_id"], other["_id"], text)
    return MessageOut.from_doc(doc)


async def mark_read(user: dict, other_id: str) -> None:
    other = await _partner(user, other_id)
    changed = await MessageModel.mark_read(user["_id"], other["_id"])
    if changed:  # avisa quem enviou (recibo de leitura) e as outras abas de quem leu
        await manager.send_to_user(str(other["_id"]), {"type": "read", "by": str(user["_id"])})
        await manager.send_to_user(str(user["_id"]), {"type": "read_sync", "with": str(other["_id"])})
