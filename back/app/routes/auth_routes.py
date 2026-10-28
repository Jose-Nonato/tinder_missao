from fastapi import APIRouter, Depends, Request, status

from app.controllers import auth_controller
from app.core.dependencies import get_current_user
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _client_ip(request: Request) -> str:
    # Atrás de um proxy reverso, este será o IP do proxy: configure o proxy/uvicorn para
    # repassar o IP real (--proxy-headers e --forwarded-allow-ips) antes de ir para produção.
    return request.client.host if request.client else "unknown"


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest):
    return await auth_controller.register(data)


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, request: Request):
    """Após 5 erros no mesmo email (ou 20 no mesmo IP) em 15 min: `429` por 15 min."""
    return await auth_controller.login(data, _client_ip(request))


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshRequest):
    return await auth_controller.refresh(data.refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(current_user: dict = Depends(get_current_user)):
    """Encerra a sessão atual: o token deixa de valer imediatamente."""
    await auth_controller.logout(current_user)


@router.post("/logout-all", status_code=status.HTTP_204_NO_CONTENT)
async def logout_all(current_user: dict = Depends(get_current_user)):
    """Encerra todas as sessões do usuário, em todos os dispositivos."""
    await auth_controller.logout_all(current_user)


@router.post("/forgot-password", response_model=MessageResponse, status_code=status.HTTP_202_ACCEPTED)
async def forgot_password(data: ForgotPasswordRequest, request: Request):
    """Pede ajuda à administração para redefinir a senha. A resposta é sempre a mesma."""
    await auth_controller.forgot_password(data.email, data.contact, _client_ip(request))
    return MessageResponse(
        message="Pedido enviado. Se o email estiver cadastrado, a administração vai entrar em "
        "contato para confirmar a sua identidade e liberar a redefinição."
    )


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
async def reset_password(data: ResetPasswordRequest):
    """Define a nova senha com o token entregue pelo admin e encerra todas as sessões abertas."""
    await auth_controller.reset_password(data)


@router.get("/me", response_model=UserResponse)
async def me(current_user: dict = Depends(get_current_user)):
    """Rota protegida: retorna o usuário dono do access token."""
    return await auth_controller.me(current_user)
