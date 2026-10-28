from fastapi import APIRouter, Depends, status

from app.controllers import question_controller
from app.core.dependencies import get_current_user, require_roles
from app.core.roles import Role
from app.schemas.question import QuestionCreate, QuestionResponse, QuestionUpdate

router = APIRouter(prefix="/questions", tags=["questions"])

admin_only = require_roles(Role.ADMIN)


# Qualquer usuário logado: perguntas ativas para responder.
# Declarada antes de "/{code}" para não ser capturada por ele.
@router.get("/active", response_model=list[QuestionResponse])
async def list_active(_: dict = Depends(get_current_user)):
    return await question_controller.list_questions(active=True)


@router.post("", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
async def create_question(data: QuestionCreate, _: dict = Depends(admin_only)):
    return await question_controller.create(data)


@router.get("", response_model=list[QuestionResponse])
async def list_questions(
    active: bool | None = None,
    topic: str | None = None,
    _: dict = Depends(admin_only),
):
    return await question_controller.list_questions(active, topic)


@router.get("/{code}", response_model=QuestionResponse)
async def get_question(code: str, _: dict = Depends(admin_only)):
    return await question_controller.get(code)


@router.patch("/{code}", response_model=QuestionResponse)
async def update_question(code: str, data: QuestionUpdate, _: dict = Depends(admin_only)):
    return await question_controller.update(code, data)


@router.delete("/{code}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question(code: str, _: dict = Depends(admin_only)):
    await question_controller.delete(code)
