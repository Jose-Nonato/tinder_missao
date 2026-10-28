from datetime import datetime
from enum import Enum

from pydantic import BaseModel

from app.schemas.safety import UserRef


class RecoveryStatus(str, Enum):
    PENDING = "pending"  # aguardando o admin
    ISSUED = "issued"  # admin gerou o link, ainda não usado
    COMPLETED = "completed"  # a pessoa criou a nova senha
    DISMISSED = "dismissed"  # admin descartou o pedido


class PasswordResetRequestOut(BaseModel):
    id: str
    user: UserRef
    email: str
    contact: str
    status: RecoveryStatus
    requested_at: datetime
    account_created_at: datetime | None = None  # ajuda o admin a conferir a identidade
    issued_by: UserRef | None = None
    issued_at: datetime | None = None
    completed_at: datetime | None = None


class IssuedResetToken(BaseModel):
    """O token aparece uma única vez; o front monta o link /reset-password?token=..."""

    token: str
    expires_at: datetime


class RecoverySummary(BaseModel):
    pending: int
    issued: int
    completed: int
    dismissed: int
