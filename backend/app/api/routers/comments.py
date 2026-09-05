"""Comment router (create a comment on a ticket)."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database import get_db
from app.models import Comment, Role, Ticket, User
from app.schemas import CommentCreate, CommentOut

router = APIRouter(prefix="/api/tickets", tags=["comments"])


@router.post("/{ticket_id}/comments", response_model=CommentOut, status_code=201)
def create_comment(
    ticket_id: int,
    payload: CommentCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Comment:
    ticket = db.get(Ticket, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if current_user.role == Role.melder and ticket.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to comment on this ticket")

    comment = Comment(ticket_id=ticket.id, author_id=current_user.id, body=payload.body)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment
