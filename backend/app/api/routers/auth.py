"""Authentication router (register, login, logout, me)."""

from fastapi import APIRouter

router = APIRouter(prefix="/api/auth", tags=["auth"])
