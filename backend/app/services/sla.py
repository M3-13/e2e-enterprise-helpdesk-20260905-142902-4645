"""SLA due-date logic.

``compute_due_at`` derives a ticket's due date from its priority relative to the
moment of creation: low +7 days, medium +3 days, high +1 day, critical +4 hours.
"""

from datetime import datetime, timedelta

from app.models import Priority, utcnow

_PRIORITY_DELTAS: dict[Priority, timedelta] = {
    Priority.low: timedelta(days=7),
    Priority.medium: timedelta(days=3),
    Priority.high: timedelta(days=1),
    Priority.critical: timedelta(hours=4),
}


def compute_due_at(priority: Priority, created_at: datetime | None = None) -> datetime:
    """Return the due date for ``priority`` relative to ``created_at``.

    When ``created_at`` is omitted the current time (naive UTC) is used.
    """
    if created_at is None:
        created_at = utcnow()
    return created_at + _PRIORITY_DELTAS[priority]
