from fastapi import HTTPException, status

from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.repositories.users import UserRepository
from app.schemas.auth import AuthResponse, Token
from app.schemas.user import UserCreate


class AuthService:
    def __init__(self, users: UserRepository) -> None:
        self.users = users

    def register(self, data: UserCreate) -> AuthResponse:
        existing_user = self.users.get_by_email(data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email is already registered",
            )

        user = self.users.create(
            email=str(data.email),
            hashed_password=hash_password(data.password),
            full_name=data.full_name.strip(),
        )
        return self._build_auth_response(user)

    def login(self, *, email: str, password: str) -> AuthResponse:
        user = self.users.get_by_email(email)
        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is disabled",
            )
        return self._build_auth_response(user)

    def _build_auth_response(self, user: User) -> AuthResponse:
        token = Token(access_token=create_access_token(str(user.id)))
        return AuthResponse(user=user, token=token)

