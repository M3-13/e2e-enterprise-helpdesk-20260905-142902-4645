"""Pydantic schemas for request and response bodies."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import Category, Priority, Role, Status


class UserCreate(BaseModel):
    email: EmailStr
    display_name: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)


class UserUpdate(BaseModel):
    role: Role | None = None
    is_active: bool | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    display_name: str
    role: Role
    is_active: bool


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TicketCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)
    category: Category
    priority: Priority


class TicketUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category: Category | None = None
    priority: Priority | None = None


class TicketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    category: Category
    priority: Priority
    status: Status
    assignee_id: int | None
    assignee_name: str | None
    created_at: datetime
    updated_at: datetime
    due_at: datetime | None
    is_overdue: bool


class CommentCreate(BaseModel):
    body: str = Field(..., min_length=1)


class CommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    body: str
    author_name: str
    created_at: datetime


class AuditOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    field: str
    old_value: str | None
    new_value: str | None
    actor_name: str
    created_at: datetime


class AssignRequest(BaseModel):
    agent_id: int


class TicketDetail(BaseModel):
    ticket: TicketOut
    comments: list[CommentOut]
    audit_entries: list[AuditOut]


class DashboardStats(BaseModel):
    open: int
    overdue: int
    closed_today: int
    priority_distribution: dict[Priority, int]
