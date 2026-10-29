from datetime import date, datetime, timedelta, timezone
from math import ceil

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException, status

from app.core.age import age_on
from app.core.config import settings
from app.core.roles import Role
from app.models.block import BlockModel
from app.models.question import QuestionModel
from app.models.swipe import SwipeModel
from app.models.user import UserModel
from app.schemas.match import (
    BreakdownItem,
    EmptyReason,
    MatchResponse,
    ProfileResponse,
    RecommendationsResponse,
    SwipeAction,
    SwipeRequest,
    SwipeResponse,
)
from app.schemas.question import NO_OPINION

# {code: {weight, topic, text}} das perguntas ativas
ActiveQuestions = dict[str, dict]


def _decisive_answers(user: dict, active: ActiveQuestions) -> dict[str, str]:
    """{questionId: optionId} das perguntas ativas em que a pessoa tem opinião.

    Perguntas inativas e respostas "não tenho opinião" ficam de fora do cálculo.
    """
    return {
        a["questionId"]: a["optionId"]
        for a in user.get("answers", [])
        if a["questionId"] in active and a["optionId"] != NO_OPINION
    }


_PUBLIC_FIELDS = ("photos", "description", "profession", "university", "city", "state", "country")


def _public_profile(user: dict) -> dict:
    """Campos do perfil que outras pessoas podem ver (sem sexo/preferência)."""
    profile = user.get("profile") or {}
    public = {k: profile[k] for k in _PUBLIC_FIELDS if k in profile}
    if birth_date := profile.get("birth_date"):  # só a idade é exposta, nunca a data
        public["age"] = age_on(date.fromisoformat(birth_date))
    return public


def _profile(other: dict, mine: dict[str, str], active: ActiveQuestions) -> ProfileResponse | None:
    """Compatibilidade ponderada: peso das respostas iguais / peso das perguntas em comum.

    Só entram perguntas em que as duas pessoas têm opinião. Retorna None se não houver nenhuma.
    """
    theirs = _decisive_answers(other, active)
    common = mine.keys() & theirs.keys()
    if not common:
        return None
    # as mais importantes primeiro
    items = [
        BreakdownItem(
            question_id=q,
            topic=active[q]["topic"],
            text=active[q]["text"],
            agree=mine[q] == theirs[q],
            weight=active[q]["weight"],
        )
        for q in sorted(common, key=lambda q: (-active[q]["weight"], q))
    ]
    total = sum(i.weight for i in items)
    agreed = sum(i.weight for i in items if i.agree)
    return ProfileResponse(
        id=str(other["_id"]),
        username=other["username"],
        compatibility=round(100 * agreed / total),
        common_questions=len(items),
        agreements=sum(1 for i in items if i.agree),
        ignored_questions=len(active) - len(items),
        breakdown=items,
        **_public_profile(other),
    )


def _profile_or_basic(other: dict, mine: dict[str, str], active: ActiveQuestions) -> ProfileResponse:
    """Como `_profile`, mas devolve um cartão sem compatibilidade quando não há perguntas em comum."""
    return _profile(other, mine, active) or ProfileResponse(
        id=str(other["_id"]),
        username=other["username"],
        compatibility=0,
        common_questions=0,
        agreements=0,
        ignored_questions=len(active),
        **_public_profile(other),
    )


_PLURAL = {"men": "homens", "women": "mulheres", "both": "homens e mulheres"}
_WHO_SEES = {"male": "homens", "female": "mulheres"}


def _empty(reason: EmptyReason, message: str) -> RecommendationsResponse:
    return RecommendationsResponse(profiles=[], empty_reason=reason, empty_message=message)


async def recommendations(user: dict, limit: int) -> RecommendationsResponse:
    my_profile = user.get("profile")
    if not my_profile or not my_profile.get("birth_date"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Complete seu perfil para ver recomendações")
    if not user.get("answers"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Responda o questionário para ver recomendações")

    active = await QuestionModel.active_map()
    mine = _decisive_answers(user, active)
    if not mine:
        return _empty(
            EmptyReason.NO_ANSWERS,
            "Você marcou “não tenho opinião” em todas as perguntas, então não há como calcular "
            "compatibilidade. Responda ao menos uma pergunta para ver recomendações.",
        )

    # Funil: cada etapa explica por que ninguém sobrou.
    if not await UserModel.count_eligible_others(user["_id"]):
        return _empty(EmptyReason.NO_USERS, "Ainda não há outras pessoas cadastradas por aqui. Volte mais tarde!")

    pool = await UserModel.find_candidates(user["_id"], my_profile["gender"], my_profile["interested_in"])
    if not pool:
        return _empty(
            EmptyReason.NO_PREFERENCE_MATCH,
            f"Ninguém combina com as suas preferências por enquanto. Você quer ver "
            f"{_PLURAL[my_profile['interested_in']]}, e cada pessoa só aparece se também quiser ver "
            f"{_WHO_SEES[my_profile['gender']]}. Você pode ajustar isso no seu perfil.",
        )

    # Curtidos e bloqueados nunca voltam; descartados voltam depois da carência (repescagem).
    liked, passed = await SwipeModel.history(user["_id"])
    hidden = liked | await BlockModel.hidden_ids(user["_id"])
    available = [other for other in pool if other["_id"] not in hidden]
    cutoff = datetime.now(timezone.utc) - timedelta(days=settings.pass_cooldown_days)
    fresh = [other for other in available if other["_id"] not in passed]
    due = [other for other in available if other["_id"] in passed and passed[other["_id"]] <= cutoff]
    if not fresh and not due:
        cooling = [passed[other["_id"]] for other in available]
        if not cooling:
            return _empty(
                EmptyReason.ALL_SEEN,
                "Você já avaliou (ou bloqueou) todas as pessoas disponíveis. Volte mais tarde para ver novos perfis!",
            )
        days = max(1, ceil((min(cooling) - cutoff) / timedelta(days=1)))
        return _empty(
            EmptyReason.ALL_SEEN,
            f"Você já viu todos os perfis novos. Quem você pulou volta a aparecer em "
            f"{days} {'dia' if days == 1 else 'dias'}, ou antes, se chegar gente nova.",
        )

    # mais compatíveis primeiro; em empate, quem tem mais perguntas em comum
    profiles = sorted(
        (p for other in fresh if (p := _profile(other, mine, active))),
        key=lambda p: (p.compatibility, p.common_questions),
        reverse=True,
    )
    # depois, a repescagem: quem foi descartado há mais tempo primeiro
    for other in sorted(due, key=lambda o: passed[o["_id"]]):
        if p := _profile(other, mine, active):
            p.revisiting = True
            profiles.append(p)
    if not profiles:
        return _empty(
            EmptyReason.NO_COMMON_QUESTIONS,
            "Há pessoas disponíveis, mas nenhuma respondeu (com opinião) as mesmas perguntas que você. "
            "Responder mais perguntas aumenta as chances de aparecer alguém.",
        )
    return RecommendationsResponse(profiles=profiles[:limit])


async def swipe(user: dict, data: SwipeRequest) -> SwipeResponse:
    try:
        target_id = ObjectId(data.user_id)
    except (InvalidId, TypeError):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuário não encontrado")
    if target_id == user["_id"]:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Você não pode avaliar a si mesmo")
    target = await UserModel.find_by_id(data.user_id)
    if (
        not target
        or target.get("role") == Role.ADMIN.value
        or target.get("suspended")
        or target_id in await BlockModel.hidden_ids(user["_id"])
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuário não encontrado")

    await SwipeModel.upsert(user["_id"], target_id, data.action.value)
    if data.action is not SwipeAction.LIKE or not await SwipeModel.liked_me(target_id, user["_id"]):
        return SwipeResponse(matched=False)

    active = await QuestionModel.active_map()
    mine = _decisive_answers(user, active)
    return SwipeResponse(matched=True, profile=_profile_or_basic(target, mine, active))


async def matches(user: dict) -> list[MatchResponse]:
    active = await QuestionModel.active_map()
    mine = _decisive_answers(user, active)
    hidden = await BlockModel.hidden_ids(user["_id"])
    found = [m for m in await SwipeModel.matches_of(user["_id"]) if m["user_id"] not in hidden]
    users = {u["_id"]: u for u in await UserModel.find_many([m["user_id"] for m in found])}
    result = []
    for m in found:
        other = users.get(m["user_id"])
        if not other or other.get("suspended"):
            continue
        result.append(MatchResponse(profile=_profile_or_basic(other, mine, active), matched_at=m["matched_at"]))
    return result
