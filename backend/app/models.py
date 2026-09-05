"""SQLAlchemy ORM models for the Enterprise Helpdesk."""

from datetime import UTC, datetime
from enum import StrEnum

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    """Return the current time as naive UTC (avoids SQLite tz round-trip issues)."""
    return datetime.now(UTC).replace(tzinfo=None)


class Category(StrEnum):
    hardware = "hardware"
    software = "software"
    network = "network"
    access = "access"
    other = "other"


class Status(StrEnum):
    open = "open"
    in_progress = "in_progress"
    resolved = "resolved"
    closed = "closed"


class Priority(StrEnum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class Role(StrEnum):
    melder = "melder"
    agent = "agent"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[Role] = mapped_column(Enum(Role), default=Role.melder, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    created_tickets: Mapped[list["Ticket"]] = relationship(
        back_populates="creator", foreign_keys="Ticket.creator_id"
    )
    assigned_tickets: Mapped[list["Ticket"]] = relationship(
        back_populates="assignee", foreign_keys="Ticket.assignee_id"
    )
    comments: Mapped[list["Comment"]] = relationship(back_populates="author")
    audit_entries: Mapped[list["AuditEntry"]] = relationship(back_populates="actor")


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[Category] = mapped_column(Enum(Category), nullable=False)
    priority: Mapped[Priority] = mapped_column(Enum(Priority), nullable=False)
    status: Mapped[Status] = mapped_column(Enum(Status), default=Status.open, nullable=False)
    creator_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    assignee_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow, nullable=False
    )
    due_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    creator: Mapped["User"] = relationship(
        back_populates="created_tickets", foreign_keys=[creator_id]
    )
    assignee: Mapped["User | None"] = relationship(
        back_populates="assigned_tickets", foreign_keys=[assignee_id]
    )
    comments: Mapped[list["Comment"]] = relationship(back_populates="ticket")
    audit_entries: Mapped[list["AuditEntry"]] = relationship(back_populates="ticket")

    @property
    def assignee_name(self) -> str | None:
        return self.assignee.display_name if self.assignee else None

    @property
    def is_overdue(self) -> bool:
        if self.status in (Status.resolved, Status.closed):
            return False
        if self.due_at is None:
            return False
        return self.due_at < utcnow()


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id"), nullable=False)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    ticket: Mapped["Ticket"] = relationship(back_populates="comments")
    author: Mapped["User"] = relationship(back_populates="comments")

    @property
    def author_name(self) -> str:
        return self.author.display_name if self.author else "Gelöschter Benutzer"


class AuditEntry(Base):
    __tablename__ = "audit_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id"), nullable=False)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    field: Mapped[str] = mapped_column(String(255), nullable=False)
    old_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    ticket: Mapped["Ticket"] = relationship(back_populates="audit_entries")
    actor: Mapped["User | None"] = relationship(back_populates="audit_entries")

    @property
    def actor_name(self) -> str:
        return self.actor.display_name if self.actor else "Gelöschter Benutzer"


class RevokedToken(Base):
    __tablename__ = "revoked_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    jti: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    revoked_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
