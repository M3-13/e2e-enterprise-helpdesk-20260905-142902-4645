"""Ticket query builder — implemented by the ticket-list ticket."""

from sqlalchemy import Select
from sqlalchemy.orm import Session

from app.models import User


def build_ticket_query(
    db: Session,
    filters: dict,
    user: User,
) -> tuple[Select, Select]:
    """Build the filtered list ``stmt`` and its ``count_stmt`` for a ticket search."""
    raise NotImplementedError
