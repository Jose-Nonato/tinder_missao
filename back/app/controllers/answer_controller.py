from fastapi import HTTPException, status

from app.models.question import QuestionModel
from app.models.user import UserModel
from app.schemas.answer import Answer, AnswersRequest, AnswersResponse
from app.schemas.question import NO_OPINION


def _stored(user: dict) -> AnswersResponse:
    return AnswersResponse(answers=[Answer.model_validate(a) for a in user.get("answers", [])])


async def get_answers(user: dict) -> AnswersResponse:
    return _stored(user)


async def save_answers(user: dict, data: AnswersRequest) -> AnswersResponse:
    """Grava as respostas; responder de novo uma pergunta substitui a resposta anterior."""
    ids = [a.question_id for a in data.answers]
    if len(set(ids)) != len(ids):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Pergunta repetida no envio")

    questions = {q["code"]: q for q in await QuestionModel.find_active_by_codes(ids)}
    for a in data.answers:
        question = questions.get(a.question_id)
        if not question:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                f"Pergunta inexistente ou inativa: {a.question_id}",
            )
        if a.option_id != NO_OPINION and a.option_id not in {o["id"] for o in question["options"]}:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                f"Opção inválida para {a.question_id}: {a.option_id}",
            )

    updated = await UserModel.merge_answers(
        user["_id"], [a.model_dump(by_alias=True) for a in data.answers]
    )
    # Questionário concluído quando todas as perguntas ativas têm resposta.
    answered = {a["questionId"] for a in updated.get("answers", [])}
    if await QuestionModel.active_codes() <= answered:
        await UserModel.mark_questionnaire_completed(user["_id"])
    return _stored(updated)
