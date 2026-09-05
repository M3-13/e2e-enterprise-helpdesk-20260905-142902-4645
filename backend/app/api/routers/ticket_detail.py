"""Ticket detail router (detail, edit, close, reopen, assign, audit)."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.database import get_db
from app.models import AuditEntry, Comment, Role, Status, Ticket, User
from app.schemas import (
    AssignRequest,
    AuditOut,
    CommentOut,
    TicketDetail,
    TicketOut,
    TicketUpdate,
)
from app.services.audit import add_audit

router = APIRouter(prefix="/api/tickets", tags=["tickets"])

Db = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]
AgentOrAdmin = Annotated[User, Depends(require_roles(Role.agent, Role.admin))]


def _get_ticket(db: Session, ticket_id: int) -> Ticket:
    ticket = db.get(Ticket, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


def _ensure_own_or_staff(ticket: Ticket, user: User) -> None:
    """Melder may only see their own tickets; agent/admin see all."""
    if user.role == Role.melder and ticket.creator_id != user.id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")


@router.get("/{id}", response_model=TicketDetail)
def get_ticket_detail(id: int, db: Db, current_user: CurrentUser) -> TicketDetail:
    ticket = _get_ticket(db, id)
    _ensure_own_or_staff(ticket, current_user)

    comments = (
        db.query(Comment)
        .filter(Comment.ticket_id == ticket.id)
        .order_by(Comment.created_at.asc())
        .all()
    )
    audit_entries = (
        db.query(AuditEntry)
        .filter(AuditEntry.ticket_id == ticket.id)
        .order_by(AuditEntry.created_at.asc())
        .all()
    )
    return TicketDetail(
        ticket=TicketOut.model_validate(ticket),
        comments=[CommentOut.model_validate(c) for c in comments],
        audit_entries=[AuditOut.model_validate(a) for a in audit_entries],
    )


@router.patch("/{id}", response_model=TicketOut)
def update_ticket(
    id: int,
    payload: TicketUpdate,
    db: Db,
    current_user: CurrentUser,
) -> TicketOut:
    ticket = _get_ticket(db, id)
    _ensure_own_or_staff(ticket, current_user)
    if current_user.role == Role.melder and ticket.status != Status.open:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    data = payload.model_dump(exclude_unset=True)
    for field in ("title", "description", "category", "priority"):
        if field not in data:
            continue
        new_value = data[field]
        old_value = getattr(ticket, field)
        if old_value != new_value:
            setattr(ticket, field, new_value)
            add_audit(db, ticket.id, current_user, field, old_value, new_value)

    db.commit()
    db.refresh(ticket)
    return TicketOut.model_validate(ticket)


@router.post("/{id}/close", response_model=TicketOut)
def close_ticket(id: int, db: Db, current_user: CurrentUser) -> TicketOut:
    ticket = _get_ticket(db, id)
    _ensure_own_or_staff(ticket, current_user)

    if ticket.status != Status.closed:
        old_status = ticket.status
        ticket.status = Status.closed
        add_audit(db, ticket.id, current_user, "status", old_status, Status.closed)

    db.commit()
    db.refresh(ticket)
    return TicketOut.model_validate(ticket)


@router.post("/{id}/reopen", response_model=TicketOut)
def reopen_ticket(id: int, db: Db, current_user: AgentOrAdmin) -> TicketOut:
    ticket = _get_ticket(db, id)

    if ticket.status != Status.open:
        old_status = ticket.status
        ticket.status = Status.open
        add_audit(db, ticket.id, current_user, "status", old_status, Status.open)

    db.commit()
    db.refresh(ticket)
    return TicketOut.model_validate(ticket)


@router.post("/{id}/assign", response_model=TicketOut)
def assign_ticket(
    id: int,
    payload: AssignRequest,
    db: Db,
    current_user: AgentOrAdmin,
) -> TicketOut:
    ticket = _get_ticket(db, id)

    agent = db.get(User, payload.agent_id)
    if agent is None or agent.role != Role.agent or not agent.is_active:
        raise HTTPException(status_code=400, detail="Assignee must be an active agent")

    if ticket.assignee_id != agent.id:
        old_assignee = ticket.assignee_id
        ticket.assignee_id = agent.id
        add_audit(db, ticket.id, current_user, "assignee_id", old_assignee, agent.id)

    db.commit()
    db.refresh(ticket)
    return TicketOut.model_validate(ticket)
