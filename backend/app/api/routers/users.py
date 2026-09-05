"""User management router."""

from fastapi import APIRouter

router = APIRouter(prefix="/api/users", tags=["users"])
