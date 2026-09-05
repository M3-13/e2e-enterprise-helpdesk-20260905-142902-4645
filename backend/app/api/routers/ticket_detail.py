"""Ticket detail router (detail, edit, close, reopen, assign, audit)."""

from fastapi import APIRouter

router = APIRouter(prefix="/api/tickets", tags=["tickets"])
