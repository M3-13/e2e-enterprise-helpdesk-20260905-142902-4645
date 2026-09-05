"""Ticket collection router (create + searchable list)."""

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database import get_db
from app.models import Priority, Status, Ticket, User, utcnow
from app.schemas import TicketCreate, TicketOut
from app.services.sla import compute_due_at
from app.services.ticket_query import build_ticket_query

router = APIRouter(prefix="/api/tickets", tags=["tickets"])

SortField = Literal["created_at", "priority", "due_at", "status"]
SortOrder = Literal["asc", "desc"]


class TicketListResponse(BaseModel):
    items: list[TicketOut]
    total: int
    page: int
    page_size: int


@router.post("", response_model=TicketOut, status_code=201)
def create_ticket(
    payload: TicketCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Ticket:
    created_at = utcnow()
    ticket = Ticket(
        title=payload.title,
        description=payload.description,
        category=payload.category,
        priority=payload.priority,
        status=Status.open,
        creator_id=current_user.id,
        due_at=compute_due_at(payload.priority, created_at),
        created_at=created_at,
        updated_at=created_at,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


@router.get("", response_model=TicketListResponse)
def list_tickets(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    search: Annotated[str | None, Query()] = None,
    status: Annotated[Status | None, Query()] = None,
    priority: Annotated[Priority | None, Query()] = None,
    assignee: Annotated[int | None, Query()] = None,
    sort: Annotated[SortField, Query()] = "created_at",
    order: Annotated[SortOrder, Query()] = "desc",
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> dict:
    filters = {
        "search": search,
        "status": status,
        "priority": priority,
        "assignee": assignee,
        "sort": sort,
        "order": order,
        "page": page,
        "page_size": page_size,
    }
    stmt, count_stmt = build_ticket_query(db, filters, current_user)
    tickets = db.scalars(stmt).all()
    total = db.scalar(count_stmt) or 0
    return {
        "items": tickets,
        "total": total,
        "page": page,
        "page_size": page_size,
    }
