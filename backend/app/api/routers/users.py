"""User management router (list, create, update, deactivate and delete users)."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.security import hash_password
from app.database import get_db
from app.models import Role, User
from app.schemas import UserCreate, UserOut, UserUpdate

router = APIRouter(prefix="/api/users", tags=["users"])

DELETED_DISPLAY_NAME = "Gelöschter Benutzer"

require_admin = require_roles(Role.admin)


class UserAdminCreate(UserCreate):
    """Admin-facing create body: like ``UserCreate`` but with an explicit role."""

    role: Role


def _deleted_email(user_id: int) -> str:
    """Unique, clearly-invalid placeholder so ``email`` stays unique but holds no PII."""
    return f"deleted-{user_id}@invalid.local"


def _is_deleted(user: User) -> bool:
    """A deleted account keeps its row (for referential integrity) but loses its hash."""
    return user.password_hash == ""


def _get_managed_user(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)
    if user is None or _is_deleted(user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


def _anonymize(user: User) -> None:
    """Remove PII (email, display name, password hash) and deactivate the account.

    The row is retained because tickets/comments keep a non-nullable foreign key
    to it; downstream ``author_name``/``actor_name``/``assignee_name`` then resolve
    to ``Gelöschter Benutzer`` via the anonymized display name.
    """
    user.email = _deleted_email(user.id)
    user.display_name = DELETED_DISPLAY_NAME
    user.password_hash = ""
    user.is_active = False


@router.get("", response_model=list[UserOut], dependencies=[Depends(require_admin)])
def list_users(db: Annotated[Session, Depends(get_db)]) -> list[User]:
    return db.query(User).filter(User.password_hash != "").order_by(User.id).all()


@router.post(
    "",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
def create_user(
    payload: UserAdminCreate,
    db: Annotated[Session, Depends(get_db)],
) -> User:
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    user = User(
        email=payload.email,
        display_name=payload.display_name,
        password_hash=hash_password(payload.password),
        role=payload.role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch(
    "/{user_id}",
    response_model=UserOut,
    dependencies=[Depends(require_admin)],
)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Annotated[Session, Depends(get_db)],
) -> User:
    user = _get_managed_user(db, user_id)
    if payload.role is not None:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active
    db.commit()
    db.refresh(user)
    return user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_self(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    _anonymize(current_user)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_admin)],
)
def delete_user(
    user_id: int,
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    user = _get_managed_user(db, user_id)
    _anonymize(user)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
