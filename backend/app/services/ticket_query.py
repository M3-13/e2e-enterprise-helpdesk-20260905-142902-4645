"""Filtered, sorted and paginated ticket query builder.

``build_ticket_query`` turns a filter dictionary into a SQLAlchemy ``Select`` for
the result rows and a second ``Select`` that counts the total matches. A melder is
restricted to the tickets they created; agents and admins see the whole list.
"""

from sqlalchemy import Select, case, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models import Priority, Role, Ticket, User

DEFAULT_SORT = "created_at"
DEFAULT_ORDER = "desc"
DEFAULT_PAGE = 1
DEFAULT_PAGE_SIZE = 20

_SORT_COLUMNS = {
    "created_at": Ticket.created_at,
    "priority": Ticket.priority,
    "due_at": Ticket.due_at,
    "status": Ticket.status,
}

_PRIORITY_SEVERITY = case(
    (Ticket.priority == Priority.critical, 4),
    (Ticket.priority == Priority.high, 3),
    (Ticket.priority == Priority.medium, 2),
    (Ticket.priority == Priority.low, 1),
    else_=0,
)


def _order_expression(sort: str, order: str):
    """Return the ORDER BY expression for ``sort``/``order`` (asc|desc)."""
    if sort == "priority":
        expression = _PRIORITY_SEVERITY
    else:
        expression = _SORT_COLUMNS.get(sort, Ticket.created_at)
    if order == "desc":
        return expression.desc()
    return expression.asc()


def build_ticket_query(
    db: Session,
    filters: dict,
    user: User,
) -> tuple[Select, Select]:
    """Build the filtered list ``stmt`` and its ``count_stmt`` for a ticket search.

    ``filters`` keys (all optional): ``search`` (title/description substring),
    ``status``, ``priority``, ``assignee`` (user id), ``sort`` (created_at,
    priority, due_at, status), ``order`` (asc|desc), ``page``, ``page_size``.
    """
    search = filters.get("search")
    status = filters.get("status")
    priority = filters.get("priority")
    assignee = filters.get("assignee")
    sort = filters.get("sort") or DEFAULT_SORT
    order = (filters.get("order") or DEFAULT_ORDER).lower()
    page = filters.get("page") or DEFAULT_PAGE
    page_size = filters.get("page_size") or DEFAULT_PAGE_SIZE

    conditions: list = []
    if user.role == Role.melder:
        conditions.append(Ticket.creator_id == user.id)
    if search:
        pattern = f"%{search}%"
        conditions.append(or_(Ticket.title.ilike(pattern), Ticket.description.ilike(pattern)))
    if status is not None:
        conditions.append(Ticket.status == status)
    if priority is not None:
        conditions.append(Ticket.priority == priority)
    if assignee is not None:
        conditions.append(Ticket.assignee_id == assignee)

    stmt = select(Ticket).where(*conditions).options(selectinload(Ticket.assignee))
    count_stmt = select(func.count()).select_from(Ticket).where(*conditions)

    stmt = stmt.order_by(_order_expression(sort, order))
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)

    return stmt, count_stmt
