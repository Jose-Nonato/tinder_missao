from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel


# Resposta especial, disponível em toda pergunta: não entra no cálculo de compatibilidade.
NO_OPINION = "NONE"

MIN_WEIGHT, MAX_WEIGHT = 1, 5


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class QuestionImage(CamelModel):
    url: str = Field(max_length=2048)
    alt_text: str = Field(default="", max_length=300)


class QuestionOption(CamelModel):
    id: str = Field(min_length=1, max_length=10)
    text: str = Field(min_length=1, max_length=300)
    image: QuestionImage | None = None


def _check_options(options: list[QuestionOption]) -> list[QuestionOption]:
    if len(options) < 2:
        raise ValueError("A pergunta precisa de pelo menos 2 opções")
    ids = [o.id for o in options]
    if any(i.upper() == NO_OPINION for i in ids):
        raise ValueError(f"O id de opção \"{NO_OPINION}\" é reservado para \"não tenho opinião\"")
    if len(set(ids)) != len(ids):
        raise ValueError("Os ids das opções devem ser únicos")
    return options


class QuestionCreate(CamelModel):
    topic: str = Field(min_length=1, max_length=100)
    text: str = Field(min_length=1, max_length=500)
    image: QuestionImage | None = None
    options: list[QuestionOption]
    weight: int = Field(default=1, ge=MIN_WEIGHT, le=MAX_WEIGHT)  # importância na compatibilidade
    active: bool = True

    @field_validator("options")
    @classmethod
    def _validate_options(cls, v):
        return _check_options(v)


class QuestionUpdate(CamelModel):
    """Atualização parcial; o `code` não pode ser alterado."""

    topic: str | None = Field(default=None, min_length=1, max_length=100)
    text: str | None = Field(default=None, min_length=1, max_length=500)
    image: QuestionImage | None = None
    options: list[QuestionOption] | None = None
    weight: int | None = Field(default=None, ge=MIN_WEIGHT, le=MAX_WEIGHT)
    active: bool | None = None

    @field_validator("options")
    @classmethod
    def _validate_options(cls, v):
        return _check_options(v) if v is not None else v


class QuestionResponse(CamelModel):
    id: str
    code: str
    topic: str
    text: str
    image: QuestionImage | None = None
    options: list[QuestionOption]
    weight: int = 1  # perguntas antigas, criadas antes do peso existir, valem 1
    active: bool

    @classmethod
    def from_doc(cls, doc: dict) -> "QuestionResponse":
        return cls.model_validate({**doc, "id": str(doc["_id"])})
