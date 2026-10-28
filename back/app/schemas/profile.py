from datetime import date
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.age import MAX_AGE, MIN_AGE, age_on

MAX_PHOTOS = 6


class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"


class Interest(str, Enum):
    MEN = "men"
    WOMEN = "women"
    BOTH = "both"


class ProfileData(BaseModel):
    """Perfil do usuário. Profissão e universidade são opcionais; o resto é obrigatório."""

    model_config = ConfigDict(str_strip_whitespace=True)

    photos: list[str] = Field(min_length=1, max_length=MAX_PHOTOS)
    birth_date: date
    gender: Gender
    interested_in: Interest
    description: str = Field(min_length=1, max_length=500)
    profession: str = Field(default="", max_length=100)
    university: str = Field(default="", max_length=100)
    city: str = Field(min_length=1, max_length=100)
    state: str = Field(min_length=1, max_length=100)
    country: str = Field(min_length=1, max_length=100)

    @field_validator("birth_date")
    @classmethod
    def _check_adult(cls, birth_date: date) -> date:
        age = age_on(birth_date)
        if birth_date > date.today() or age > MAX_AGE:
            raise ValueError("Data de nascimento inválida")
        if age < MIN_AGE:
            raise ValueError(f"É necessário ter {MIN_AGE} anos ou mais para usar o app")
        return birth_date

    @field_validator("photos")
    @classmethod
    def _check_photos(cls, photos: list[str]) -> list[str]:
        # só aceita arquivos enviados pelo próprio sistema (/uploads/<arquivo>)
        for url in photos:
            name = url.removeprefix("/uploads/")
            if name == url or not name or "/" in name or "\\" in name or ".." in name:
                raise ValueError("Foto inválida: envie as imagens pelo upload")
        if len(set(photos)) != len(photos):
            raise ValueError("Foto repetida")
        return photos


class ProfileRead(ProfileData):
    """Leitura do próprio perfil; perfis antigos podem ainda não ter data de nascimento."""

    birth_date: date | None = None
