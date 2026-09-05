"""Audit-log service: record ticket field changes."""

from enum import StrEnum

from sqlalchemy.orm import Session

from app.models import AuditEntry, User


def _to_str(value: object | None) -> str | None:
    """Normalise an audited value to a string for storage."""
    if value is None:
        return None
    if isinstance(value, StrEnum):
        return value.value
    return str(value)


def add_audit(
    db: Session,
    ticket_id: int,
    actor: User,
    field: str,
    old: object | None,
    new: object | None,
) -> AuditEntry:
    """Create an audit entry for ``ticket_id`` (persisted on the caller's commit)."""
    entry = AuditEntry(
        ticket_id=ticket_id,
        actor=actor,
        field=field,
        old_value=_to_str(old),
        new_value=_to_str(new),
    )
    db.add(entry)
    return entry
