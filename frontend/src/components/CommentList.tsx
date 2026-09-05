import { useState, type FormEvent } from "react";
import type { CommentOut } from "../api/client";

function formatDateTime(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString("de-DE");
}

interface CommentListProps {
  comments: CommentOut[];
  submitting: boolean;
  onSubmit: (body: string) => Promise<void>;
}

export default function CommentList({
  comments,
  submitting,
  onSubmit,
}: CommentListProps) {
  const [body, setBody] = useState("");

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    void onSubmit(trimmed).then(() => setBody(""));
  }

  return (
    <section className="card comments">
      <h2 className="comments__title">Kommentare</h2>
      {comments.length === 0 ? (
        <p className="page__text">Noch keine Kommentare.</p>
      ) : (
        <ul className="comments__list">
          {comments.map((c) => (
            <li key={c.id} className="comment">
              <div className="comment__header">
                <span className="comment__author">{c.author_name}</span>
                <span className="comment__time">{formatDateTime(c.created_at)}</span>
              </div>
              <p className="comment__body">{c.body}</p>
            </li>
          ))}
        </ul>
      )}
      <form className="comment-form" onSubmit={handleSubmit}>
        <textarea
          className="comment-form__textarea"
          placeholder="Kommentar schreiben…"
          value={body}
          disabled={submitting}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
        />
        <div className="comment-form__actions">
          <button
            type="submit"
            className="btn btn--primary"
            disabled={submitting || body.trim() === ""}
          >
            {submitting ? "Senden…" : "Kommentieren"}
          </button>
        </div>
      </form>
      <style>{`
        .comments__title { font-size: 18px; }
        .comments__list {
          list-style: none;
          margin: 0 0 var(--space-3);
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .comment {
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--space-3);
          background-color: var(--color-surface);
        }
        .comment__header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: var(--space-2);
          margin-bottom: var(--space-1);
        }
        .comment__author { font-weight: 600; }
        .comment__time { font-size: 12px; color: var(--color-muted); }
        .comment__body { margin: 0; white-space: pre-wrap; }
        .comment-form { display: flex; flex-direction: column; gap: var(--space-2); }
        .comment-form__textarea {
          width: 100%;
          min-height: 80px;
          padding: 10px var(--space-2);
          background-color: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 14px;
          color: var(--color-fg);
          font-family: inherit;
          resize: vertical;
        }
        .comment-form__textarea:focus {
          border-color: var(--color-accent);
          outline: none;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
        }
      `}</style>
    </section>
  );
}
