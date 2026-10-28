from datetime import datetime

from pydantic import BaseModel


class MessageOut(BaseModel):
    id: str
    sender_id: str
    recipient_id: str
    text: str
    created_at: datetime
    read_at: datetime | None = None
    client_id: str | None = None  # só no eco para quem enviou (confirma a mensagem otimista)

    @classmethod
    def from_doc(cls, doc: dict) -> "MessageOut":
        return cls(
            id=str(doc["_id"]),
            sender_id=str(doc["sender_id"]),
            recipient_id=str(doc["recipient_id"]),
            text=doc["text"],
            created_at=doc["created_at"],
            read_at=doc.get("read_at"),
        )


class ChatUser(BaseModel):
    id: str
    username: str
    photo: str | None = None
    age: int | None = None


class ConversationOut(BaseModel):
    user: ChatUser
    last_message: MessageOut | None = None
    unread: int
    matched_at: datetime


class HistoryOut(BaseModel):
    messages: list[MessageOut]
    has_more: bool
