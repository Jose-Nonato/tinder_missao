from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class ReportReason(str, Enum):
    FAKE_PROFILE = "fake_profile"
    INAPPROPRIATE_CONTENT = "inappropriate_content"
    HARASSMENT = "harassment"
    UNDERAGE = "underage"
    SPAM = "spam"
    OTHER = "other"


class ReportStatus(str, Enum):
    OPEN = "open"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"


class BlockRequest(BaseModel):
    user_id: str


class BlockedUser(BaseModel):
    id: str
    username: str
    photo: str | None = None
    blocked_at: datetime


class ReportRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    user_id: str
    reason: ReportReason
    details: str = Field(default="", max_length=500)
    block: bool = True  # bloquear a pessoa denunciada junto com a denúncia


# ---- moderação (admin) ----


class UserRef(BaseModel):
    id: str
    username: str


class ReportResponse(BaseModel):
    id: str
    reporter: UserRef
    reported: UserRef
    reason: ReportReason
    details: str
    status: ReportStatus
    reports_against_user: int  # total de denúncias recebidas por quem foi denunciado
    reported_suspended: bool
    resolution_note: str = ""
    resolved_by: UserRef | None = None
    resolved_at: datetime | None = None
    created_at: datetime


class ReportedProfile(BaseModel):
    """O que o admin vê do perfil denunciado (inclui sexo, que os outros usuários não veem)."""

    age: int | None = None
    gender: str | None = None
    photos: list[str] = []
    description: str = ""
    profession: str = ""
    university: str = ""
    city: str = ""
    state: str = ""
    country: str = ""


class ReportHistoryItem(BaseModel):
    id: str
    reporter: UserRef
    reason: ReportReason
    details: str
    status: ReportStatus
    created_at: datetime


class ReportDetail(ReportResponse):
    reported_profile: ReportedProfile | None = None
    suspended_reason: str = ""
    history: list[ReportHistoryItem] = []  # outras denúncias contra a mesma pessoa


class ReportStatusUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    status: ReportStatus
    note: str = Field(default="", max_length=500)


class ReportSummary(BaseModel):
    open: int
    resolved: int
    dismissed: int


class SuspensionRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    reason: str = Field(min_length=1, max_length=300)


class SuspensionResult(BaseModel):
    suspended: bool
    closed_reports: int  # denúncias abertas que foram encerradas junto com a suspensão
