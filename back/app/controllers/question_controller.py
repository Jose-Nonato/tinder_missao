from fastapi import HTTPException, status

from app.models.question import QuestionModel
from app.schemas.question import QuestionCreate, QuestionResponse, QuestionUpdate

_NOT_FOUND = "Pergunta não encontrada"


async def create(data: QuestionCreate) -> QuestionResponse:
    doc = await QuestionModel.create(data.model_dump(by_alias=True))
    return QuestionResponse.from_doc(doc)


async def list_questions(
    active: bool | None = None,
    topic: str | None = None,
) -> list[QuestionResponse]:
    filters: dict = {}
    if active is not None:
        filters["active"] = active
    if topic:
        filters["topic"] = topic
    return [QuestionResponse.from_doc(d) for d in await QuestionModel.list(filters)]


async def get(code: str) -> QuestionResponse:
    doc = await QuestionModel.find_by_code(code)
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, _NOT_FOUND)
    return QuestionResponse.from_doc(doc)


async def update(code: str, data: QuestionUpdate) -> QuestionResponse:
    changes = data.model_dump(by_alias=True, exclude_unset=True)
    if not changes:
        return await get(code)
    doc = await QuestionModel.update(code, changes)
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, _NOT_FOUND)
    return QuestionResponse.from_doc(doc)


async def delete(code: str) -> None:
    if not await QuestionModel.delete(code):
        raise HTTPException(status.HTTP_404_NOT_FOUND, _NOT_FOUND)
