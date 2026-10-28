from datetime import datetime

from pydantic import BaseModel, Field

from app.core.roles import Role


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=30, pattern=r"^[A-Za-z0-9_.-]+$")
    email: str = Field(max_length=254, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(max_length=128)


class ForgotPasswordRequest(BaseModel):
    email: str = Field(max_length=254)
    # como o admin pode falar com a pessoa para confirmar a identidade (WhatsApp, telefone...)
    contact: str = Field(default="", max_length=200)


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=20, max_length=200)
    new_password: str = Field(min_length=8, max_length=128)


class MessageResponse(BaseModel):
    message: str


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    role: Role
    questionnaire_completed: bool = False
    profile_completed: bool = False
    suspended: bool = False
    created_at: datetime

    @classmethod
    def from_doc(cls, doc: dict, questionnaire_completed: bool | None = None) -> "UserResponse":
        if questionnaire_completed is None:
            questionnaire_completed = doc.get("questionnaire_completed", False)
        return cls(
            id=str(doc["_id"]),
            username=doc["username"],
            email=doc["email"],
            role=doc.get("role", Role.USER),
            questionnaire_completed=questionnaire_completed,
            profile_completed=bool(
                doc.get("profile_completed") and (doc.get("profile") or {}).get("birth_date")
            ),
            suspended=bool(doc.get("suspended", False)),
            created_at=doc["created_at"],
        )


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
