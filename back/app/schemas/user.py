from pydantic import BaseModel

from app.core.roles import Role


class UpdateRoleRequest(BaseModel):
    role: Role
