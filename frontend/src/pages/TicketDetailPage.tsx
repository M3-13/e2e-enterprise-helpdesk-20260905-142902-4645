import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  api,
  type Role,
  type TicketDetail,
  type TicketStatus,
  type UpdateTicketPayload,
  type UserOut,
} from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useFeedback } from "../components/Feedback";
import AuditLog from "../components/AuditLog";
import CommentList from "../components/CommentList";
import TicketForm, {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
} from "../components/TicketForm";
import { formatDateTime } from "../lib/format";

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Offen",
  in_progress: "In Bearbeitung",
  resolved: "Gelöst",
  closed: "Geschlossen",
};

const STATUS_BADGE_CLASS: Record<TicketStatus, string> = {
  open: "badge badge--open",
  in_progress: "badge badge--in_progress",
  resolved: "badge badge--resolved",
  closed: "badge badge--closed",
};

export function canEditTicket(role: Role | null, status: TicketStatus): boolean {
  if (role === "agent" || role === "admin") return true;
  if (role === "melder") return status === "open";
  return false;
}

export function canCloseTicket(role: Role | null, status: TicketStatus): boolean {
  return (
    (role === "agent" || role === "admin") &&
    (status === "open" || status === "in_progress")
  );
}

export function canReopenTicket(role: Role | null, status: TicketStatus): boolean {
  return (
    (role === "agent" || role === "admin") &&
    (status === "closed" || status === "resolved")
  );
}

export function canAssignTicket(role: Role | null): boolean {
  return role === "agent" || role === "admin";
}

export function selectAssignableAgents(
  users: UserOut[] | null,
  currentUser: UserOut | null,
): UserOut[] {
  if (users) {
    return users.filter((u) => u.is_active && (u.role === "agent" || u.role === "admin"));
  }
  if (currentUser && (currentUser.role === "agent" || currentUser.role === "admin")) {
    return [currentUser];
  }
  return [];
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showSuccess, showError } = useFeedback();

  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [agents, setAgents] = useState<UserOut[]>([]);
  const [selectedAgent, setSelectedAgent] = useState("");

  const role: Role | null = user?.role ?? null;

  const reload = useCallback(async () => {
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      setError("Ungültige Ticket-ID.");
      setLoading(false);
      return;
    }
    try {
      const data = await api.getTicket(numericId);
      setDetail(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ticket konnte nicht geladen werden.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const loadAgents = useCallback(async () => {
    if (role !== "agent" && role !== "admin") return;
    try {
      const users = await api.listUsers();
      setAgents(selectAssignableAgents(users, user));
    } catch {
      setAgents(selectAssignableAgents(null, user));
    }
  }, [role, user]);

  useEffect(() => {
    void loadAgents();
  }, [loadAgents]);

  async function handleUpdate(payload: UpdateTicketPayload) {
    const t = detail?.ticket;
    if (!t) return;
    setBusy(true);
    try {
      await api.updateTicket(t.id, payload);
      showSuccess("Ticket gespeichert.");
      await reload();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Speichern fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function handleClose() {
    const t = detail?.ticket;
    if (!t) return;
    setBusy(true);
    try {
      await api.closeTicket(t.id);
      showSuccess("Ticket geschlossen.");
      await reload();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Schließen fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReopen() {
    const t = detail?.ticket;
    if (!t) return;
    setBusy(true);
    try {
      await api.reopenTicket(t.id);
      showSuccess("Ticket wieder geöffnet.");
      await reload();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Wiederöffnen fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAssign(agentId: number) {
    const t = detail?.ticket;
    if (!t) return;
    setBusy(true);
    try {
      await api.assignTicket(t.id, agentId);
      showSuccess("Ticket zugewiesen.");
      await reload();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Zuweisen fehlgeschlagen.");
    } finally {
      setBusy(false);
      setSelectedAgent("");
    }
  }

  async function handleAddComment(body: string) {
    const t = detail?.ticket;
    if (!t) return;
    setBusy(true);
    try {
      await api.addComment(t.id, body);
      showSuccess("Kommentar hinzugefügt.");
      await reload();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Kommentar konnte nicht gespeichert werden.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <section className="page">
        <h1 className="page__title">Ticket-Detail</h1>
        <p className="page__text">Lade Ticket…</p>
      </section>
    );
  }

  if (error || !detail || !detail.ticket) {
    return (
      <section className="page">
        <h1 className="page__title">Ticket-Detail</h1>
        <p className="page__text">{error ?? "Ticket nicht gefunden."}</p>
      </section>
    );
  }

  const ticket = detail.ticket;

  return (
    <section className="page">
      <div className="ticket-detail__header">
        <h1 className="page__title">{ticket.title}</h1>
        <div className="ticket-detail__badges">
          <span className={STATUS_BADGE_CLASS[ticket.status]}>
            {STATUS_LABELS[ticket.status]}
          </span>
          {ticket.is_overdue && <span className="badge badge--overdue">Überfällig</span>}
        </div>
      </div>

      <dl className="ticket-meta">
        <div className="ticket-meta__item">
          <dt className="ticket-meta__label">Kategorie</dt>
          <dd className="ticket-meta__value">{CATEGORY_LABELS[ticket.category]}</dd>
        </div>
        <div className="ticket-meta__item">
          <dt className="ticket-meta__label">Priorität</dt>
          <dd className="ticket-meta__value">{PRIORITY_LABELS[ticket.priority]}</dd>
        </div>
        <div className="ticket-meta__item">
          <dt className="ticket-meta__label">Zuständig</dt>
          <dd className="ticket-meta__value">
            {ticket.assignee_name ?? "Nicht zugewiesen"}
          </dd>
        </div>
        <div className="ticket-meta__item">
          <dt className="ticket-meta__label">Fällig am</dt>
          <dd className="ticket-meta__value">{formatDateTime(ticket.due_at)}</dd>
        </div>
        <div className="ticket-meta__item">
          <dt className="ticket-meta__label">Erstellt</dt>
          <dd className="ticket-meta__value">{formatDateTime(ticket.created_at)}</dd>
        </div>
        <div className="ticket-meta__item">
          <dt className="ticket-meta__label">Zuletzt geändert</dt>
          <dd className="ticket-meta__value">{formatDateTime(ticket.updated_at)}</dd>
        </div>
      </dl>

      <div className="ticket-actions">
        {canCloseTicket(role, ticket.status) && (
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => void handleClose()}
            disabled={busy}
          >
            Schließen
          </button>
        )}
        {canReopenTicket(role, ticket.status) && (
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => void handleReopen()}
            disabled={busy}
          >
            Wiederöffnen
          </button>
        )}
        {canAssignTicket(role) && (
          <div className="assign">
            <label className="label" htmlFor="assignee">
              Zuweisen an
            </label>
            <select
              id="assignee"
              className="input"
              value={selectedAgent}
              disabled={busy}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedAgent(value);
                if (value === "") return;
                void handleAssign(Number(value));
              }}
            >
              <option value="">
                {ticket.assignee_name
                  ? `Zugewiesen an ${ticket.assignee_name}`
                  : "Agent auswählen…"}
              </option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.display_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="ticket-detail__description">
        <h2 className="ticket-detail__subtitle">Beschreibung</h2>
        <p className="ticket-detail__description-text">
          {ticket.description || "Keine Beschreibung."}
        </p>
      </div>

      <TicketForm
        key={`${ticket.id}-${ticket.updated_at}`}
        ticket={ticket}
        canEdit={canEditTicket(role, ticket.status)}
        submitting={busy}
        onSubmit={handleUpdate}
      />

      <CommentList
        comments={detail.comments}
        submitting={busy}
        onSubmit={handleAddComment}
      />

      <AuditLog audit={detail.audit} />

      <style>{`
        .ticket-detail__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: var(--space-2);
          margin-bottom: var(--space-3);
        }
        .ticket-detail__badges {
          display: flex;
          align-items: center;
          gap: var(--space-1);
        }
        .badge--open { color: var(--color-accent); border-color: var(--color-accent); }
        .badge--in_progress { color: var(--color-warning); border-color: var(--color-warning); }
        .badge--resolved { color: var(--color-success); border-color: var(--color-success); }
        .badge--closed { color: var(--color-muted); border-color: var(--color-muted); }
        .badge--overdue {
          color: var(--color-danger);
          border-color: var(--color-overdue_border);
          background-color: var(--color-overdue_bg);
          font-weight: 700;
        }
        .ticket-meta {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-3);
          margin: 0 0 var(--space-4);
          padding: var(--space-3);
          background-color: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
        }
        @media (max-width: 767px) {
          .ticket-meta { grid-template-columns: 1fr 1fr; }
        }
        .ticket-meta__item { margin: 0; }
        .ticket-meta__label {
          font-size: 12px;
          color: var(--color-muted);
          margin-bottom: var(--space-0);
        }
        .ticket-meta__value { margin: 0; font-weight: 500; }
        .ticket-actions {
          display: flex;
          align-items: flex-end;
          flex-wrap: wrap;
          gap: var(--space-2);
          margin-bottom: var(--space-3);
        }
        .assign { display: flex; flex-direction: column; gap: 6px; }
        .assign .label { margin-bottom: 0; }
        .assign .input { min-width: 220px; }
        .ticket-detail__description { margin-bottom: var(--space-3); }
        .ticket-detail__subtitle { font-size: 18px; margin-bottom: var(--space-1); }
        .ticket-detail__description-text { margin: 0; white-space: pre-wrap; }
      `}</style>
    </section>
  );
}
