"""Ticket collection router (create + searchable list)."""

from fastapi import APIRouter

router = APIRouter(prefix="/api/tickets", tags=["tickets"])
