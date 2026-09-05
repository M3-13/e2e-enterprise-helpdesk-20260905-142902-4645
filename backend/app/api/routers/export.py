"""CSV export router.

``GET /api/export/tickets`` streams the currently filtered ticket list as a CSV
file. It accepts the same query parameters as ``GET /api/tickets`` (search,
status, priority, assignee, sort, order) but ignores pagination and returns one
row per matching ticket. Only agents and administrators may call it.
"""

import csv
import io
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.database import get_db
from app.models import Priority, Role, Status, Ticket, User
from app.services.ticket_query import build_ticket_query

router = APIRouter(prefix="/api/export", tags=["export"])

SortField = Literal["created_at", "priority", "due_at", "status"]
SortOrder = Literal["asc", "desc"]

require_agent_or_admin = require_roles(Role.agent, Role.admin)

CSV_HEADER = [
    "Titel",
    "Kategorie",
    "Priorität",
    "Status",
    "Zuständigkeit",
    "Erstelldatum",
    "Fälligkeitsdatum",
    "Überfällig-Kennzeichnung",
]


def _csv_row(ticket: Ticket) -> list[str]:
    """Render one ticket as a CSV row (assignee as display name, overdue as Ja/Nein)."""
    return [
        ticket.title,
        ticket.category.value,
        ticket.priority.value,
        ticket.status.value,
        ticket.assignee_name or "",
        ticket.created_at.isoformat(),
        ticket.due_at.isoformat() if ticket.due_at else "",
        "Ja" if ticket.is_overdue else "Nein",
    ]


@router.get("/tickets")
def export_tickets(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_agent_or_admin)],
    search: Annotated[str | None, Query()] = None,
    status: Annotated[Status | None, Query()] = None,
    priority: Annotated[Priority | None, Query()] = None,
    assignee: Annotated[int | None, Query()] = None,
    sort: Annotated[SortField, Query()] = "created_at",
    order: Annotated[SortOrder, Query()] = "desc",
) -> Response:
    filters = {
        "search": search,
        "status": status,
        "priority": priority,
        "assignee": assignee,
        "sort": sort,
        "order": order,
    }
    stmt, _ = build_ticket_query(db, filters, current_user)
    tickets = db.scalars(stmt.limit(None).offset(None)).all()

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(CSV_HEADER)
    for ticket in tickets:
        writer.writerow(_csv_row(ticket))

    return Response(
        content=buffer.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="tickets.csv"'},
    )
