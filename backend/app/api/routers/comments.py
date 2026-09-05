"""Comment router."""

from fastapi import APIRouter

router = APIRouter(prefix="/api/tickets", tags=["comments"])
