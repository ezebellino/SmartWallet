from pydantic import BaseModel

from app.schemas.user import UserRead


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    user: UserRead
    token: Token

