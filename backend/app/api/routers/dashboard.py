"""Dashboard metrics router."""

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database import get_db
from app.models import Priority, Role, Status, Ticket, User, utcnow
from app.schemas import DashboardStats

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _scope(user: User) -> list:
    """Return the visibility filter for the current user.

    Melder (reporters) only see the values of their own tickets; agents and
    administrators see global values.
    """
    if user.role == Role.melder:
        return [Ticket.creator_id == user.id]
    return []


@router.get("", response_model=DashboardStats)
def get_dashboard(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> DashboardStats:
    now = utcnow()
    scope = _scope(current_user)

    open_count = db.query(Ticket).filter(*scope, Ticket.status != Status.closed).count()

    overdue_count = (
        db.query(Ticket)
        .filter(
            *scope,
            Ticket.status != Status.closed,
            Ticket.due_at.is_not(None),
            Ticket.due_at < now,
        )
        .count()
    )

    start_of_today = datetime(now.year, now.month, now.day)
    closed_today_count = (
        db.query(Ticket)
        .filter(
            *scope,
            Ticket.status == Status.closed,
            Ticket.updated_at >= start_of_today,
        )
        .count()
    )

    # priority_distribution is the raw count per priority across all visible
    # tickets (no status filter), per the ticket's "counts per priority".
    rows = (
        db.query(Ticket.priority, func.count(Ticket.id))
        .filter(*scope)
        .group_by(Ticket.priority)
        .all()
    )
    priority_distribution = dict.fromkeys(Priority, 0)
    for priority, count in rows:
        priority_distribution[priority] = count

    return DashboardStats(
        open=open_count,
        overdue=overdue_count,
        closed_today=closed_today_count,
        priority_distribution=priority_distribution,
    )
