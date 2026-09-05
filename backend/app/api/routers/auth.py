"""Authentication router (register, login, logout, me)."""

import threading
import time
from collections import deque
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import Response
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.api.deps import bearer_scheme, get_current_user
from app.core.security import (
    create_access_token,
    hash_password,
    revoke_token,
    verify_password,
)
from app.database import get_db
from app.models import Role, User
from app.schemas import LoginRequest, TokenResponse, UserCreate, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RateLimiter:
    """Track failed attempts per client IP inside a sliding time window."""

    def __init__(self, limit: int = 5, window_seconds: int = 60) -> None:
        self._limit = limit
        self._window = window_seconds
        self._failures: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def _prune(self, ip: str, now: float) -> None:
        entries = self._failures.get(ip)
        if entries is None:
            return
        cutoff = now - self._window
        while entries and entries[0] <= cutoff:
            entries.popleft()

    def record_failure(self, ip: str) -> None:
        now = time.monotonic()
        with self._lock:
            self._prune(ip, now)
            self._failures.setdefault(ip, deque()).append(now)

    def is_limited(self, ip: str) -> bool:
        now = time.monotonic()
        with self._lock:
            self._prune(ip, now)
            entries = self._failures.get(ip)
            return entries is not None and len(entries) >= self._limit

    def reset(self) -> None:
        with self._lock:
            self._failures.clear()


auth_limiter = RateLimiter()


def _client_ip(request: Request) -> str:
    if request.client is None:
        return "unknown"
    return request.client.host


def _reject_if_limited(request: Request) -> None:
    if auth_limiter.is_limited(_client_ip(request)):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts. Please try again later.",
        )


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(
    payload: UserCreate,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
) -> User:
    _reject_if_limited(request)
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing is not None:
        auth_limiter.record_failure(_client_ip(request))
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )
    user = User(
        email=payload.email,
        display_name=payload.display_name,
        password_hash=hash_password(payload.password),
        role=Role.melder,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
) -> TokenResponse:
    _reject_if_limited(request)
    user = db.query(User).filter(User.email == payload.email).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        auth_limiter.record_failure(_client_ip(request))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        auth_limiter.record_failure(_client_ip(request))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is deactivated",
        )
    token = create_access_token(subject=str(user.id))
    return TokenResponse(access_token=token, token_type="bearer")


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Response:
    if credentials is not None:
        revoke_token(db, credentials.credentials)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=UserOut)
def me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    return current_user
