"""Password hashing and JWT token management."""

import uuid
from datetime import UTC, datetime, timedelta

import jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import settings
from app.models import RevokedToken, utcnow

ALGORITHM = "HS256"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def _secret() -> str:
    secret = settings.jwt_secret
    if not secret:
        raise RuntimeError(
            "JWT_SECRET is not configured. Set it via RUN.json (class 'generate') "
            "or the environment before issuing tokens."
        )
    return secret


def create_access_token(subject: str) -> str:
    """Create a signed JWT for ``subject`` (the user id as a string)."""
    now = datetime.now(UTC)
    expire = now + timedelta(hours=settings.access_token_expire_hours)
    payload = {
        "sub": str(subject),
        "jti": uuid.uuid4().hex,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    return jwt.encode(payload, _secret(), algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and verify a JWT. Raises ``jwt.PyJWTError`` subclasses on failure."""
    return jwt.decode(token, _secret(), algorithms=[ALGORITHM])


def revoke_token(db: Session, token: str) -> None:
    """Persist the token's ``jti`` so it can no longer be accepted."""
    try:
        payload = decode_token(token)
    except jwt.PyJWTError:
        return
    jti = payload.get("jti")
    if not jti:
        return
    if db.query(RevokedToken).filter(RevokedToken.jti == jti).first() is None:
        db.add(RevokedToken(jti=jti, revoked_at=utcnow()))
        db.commit()


def is_revoked(db: Session, token: str) -> bool:
    """Return True when the token's ``jti`` is recorded in the revoke table."""
    try:
        payload = decode_token(token)
    except jwt.PyJWTError:
        return True
    jti = payload.get("jti")
    if not jti:
        return True
    return db.query(RevokedToken).filter(RevokedToken.jti == jti).first() is not None
