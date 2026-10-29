from datetime import datetime
from enum import Enum

from pydantic import BaseModel


class SwipeAction(str, Enum):
    LIKE = "like"
    PASS = "pass"


class SwipeRequest(BaseModel):
    user_id: str
    action: SwipeAction


class BreakdownItem(BaseModel):
    """Uma pergunta que entrou no cálculo da compatibilidade."""

    question_id: str
    topic: str
    text: str
    agree: bool
    weight: int  # importância da pergunta (1-5)


class ProfileResponse(BaseModel):
    id: str
    username: str
    compatibility: int  # 0-100: peso das respostas iguais / peso das perguntas em comum
    common_questions: int  # perguntas que entraram no cálculo
    agreements: int  # quantas dessas perguntas têm a mesma resposta
    ignored_questions: int = 0  # ativas que ficaram de fora (sem resposta ou "não tenho opinião")
    breakdown: list[BreakdownItem] = []
    age: int | None = None
    photos: list[str] = []
    description: str = ""
    profession: str = ""
    university: str = ""
    city: str = ""
    state: str = ""
    country: str = ""
    revisiting: bool = False  # já foi descartado antes e voltou na repescagem


class SwipeResponse(BaseModel):
    matched: bool
    profile: ProfileResponse | None = None


class MatchResponse(BaseModel):
    profile: ProfileResponse
    matched_at: datetime


class EmptyReason(str, Enum):
    NO_ANSWERS = "no_answers"  # tudo "não tenho opinião": não há como comparar
    NO_USERS = "no_users"  # ninguém mais cadastrado e elegível
    NO_PREFERENCE_MATCH = "no_preference_match"  # ninguém combina com as preferências (dos dois lados)
    ALL_SEEN = "all_seen"  # já curtiu ou bloqueou todo mundo, ou os descartados ainda estão na carência
    NO_COMMON_QUESTIONS = "no_common_questions"  # há gente, mas sem perguntas respondidas em comum


class RecommendationsResponse(BaseModel):
    profiles: list[ProfileResponse]
    empty_reason: EmptyReason | None = None  # preenchido só quando `profiles` vem vazio
    empty_message: str = ""
