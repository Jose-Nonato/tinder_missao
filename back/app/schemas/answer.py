from pydantic import Field

from app.schemas.question import CamelModel


class Answer(CamelModel):
    question_id: str = Field(min_length=1, max_length=50)
    option_id: str = Field(min_length=1, max_length=10)


class AnswersRequest(CamelModel):
    answers: list[Answer] = Field(min_length=1)


class AnswersResponse(CamelModel):
    answers: list[Answer]
