from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.repositories.users import UserRepository
from app.schemas.auth import AuthResponse, LoginRequest
from app.schemas.user import UserCreate, UserRead
from app.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    return AuthService(UserRepository(db))


@router.post("/register", response_model=AuthResponse, status_code=201)
def register(
    data: UserCreate,
    auth_service: AuthService = Depends(get_auth_service),
) -> AuthResponse:
    return auth_service.register(data)


@router.post("/login", response_model=AuthResponse)
def login(
    data: LoginRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> AuthResponse:
    return auth_service.login(email=data.email, password=data.password)


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user

