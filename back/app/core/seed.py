from app.core import security
from app.core.config import settings
from app.core.roles import Role
from app.models.user import EmailOrUsernameTaken, UserModel


async def seed_admin() -> None:
    """Cria o admin inicial a partir do .env, se ainda não existir."""
    if not (settings.admin_username and settings.admin_email and settings.admin_password):
        return
    email = settings.admin_email.lower()
    if await UserModel.find_by_email(email):
        return
    try:
        await UserModel.create(
            settings.admin_username,
            email,
            security.hash_password(settings.admin_password),
            Role.ADMIN,
        )
    except EmailOrUsernameTaken:
        pass
