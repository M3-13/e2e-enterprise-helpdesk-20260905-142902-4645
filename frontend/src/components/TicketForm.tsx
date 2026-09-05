import { useState, type FormEvent } from "react";
import type {
  Category,
  Priority,
  TicketOut,
  UpdateTicketPayload,
} from "../api/client";

export const CATEGORIES: Category[] = [
  "hardware",
  "software",
  "network",
  "access",
  "other",
];

export const PRIORITIES: Priority[] = ["low", "medium", "high", "critical"];

export const CATEGORY_LABELS: Record<Category, string> = {
  hardware: "Hardware",
  software: "Software",
  network: "Netzwerk",
  access: "Zugang",
  other: "Sonstiges",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Niedrig",
  medium: "Mittel",
  high: "Hoch",
  critical: "Kritisch",
};

interface TicketFormProps {
  ticket: TicketOut;
  canEdit: boolean;
  submitting: boolean;
  onSubmit: (payload: UpdateTicketPayload) => Promise<void>;
}

export default function TicketForm({
  ticket,
  canEdit,
  submitting,
  onSubmit,
}: TicketFormProps) {
  const [title, setTitle] = useState(ticket.title);
  const [description, setDescription] = useState(ticket.description);
  const [category, setCategory] = useState<Category>(ticket.category);
  const [priority, setPriority] = useState<Priority>(ticket.priority);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void onSubmit({ title, description, category, priority });
  }

  return (
    <section className="card ticket-form">
      <h2 className="ticket-form__title">Stammdaten</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-field">
            <label className="label" htmlFor="ticket-title">
              Titel
            </label>
            <input
              id="ticket-title"
              className="input"
              type="text"
              value={title}
              disabled={!canEdit || submitting}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label className="label" htmlFor="ticket-category">
              Kategorie
            </label>
            <select
              id="ticket-category"
              className="input"
              value={category}
              disabled={!canEdit || submitting}
              onChange={(e) => setCategory(e.target.value as Category)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="label" htmlFor="ticket-priority">
              Priorität
            </label>
            <select
              id="ticket-priority"
              className="input"
              value={priority}
              disabled={!canEdit || submitting}
              onChange={(e) => setPriority(e.target.value as Priority)}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field form-field--full">
            <label className="label" htmlFor="ticket-description">
              Beschreibung
            </label>
            <textarea
              id="ticket-description"
              className="ticket-form__textarea"
              value={description}
              disabled={!canEdit || submitting}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
            />
          </div>
        </div>
        {canEdit && (
          <div className="ticket-form__actions">
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? "Speichern…" : "Speichern"}
            </button>
          </div>
        )}
      </form>
      <style>{`
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-3);
        }
        @media (max-width: 767px) {
          .form-grid { grid-template-columns: 1fr; }
        }
        .form-field { display: flex; flex-direction: column; gap: 6px; }
        .form-field .label { margin-bottom: 0; }
        .form-field--full { grid-column: 1 / -1; }
        .form-field .input,
        .form-field .ticket-form__textarea { width: 100%; }
        .ticket-form__textarea {
          min-height: 100px;
          padding: 10px var(--space-2);
          background-color: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 14px;
          color: var(--color-fg);
          font-family: inherit;
          resize: vertical;
        }
        .ticket-form__textarea:focus {
          border-color: var(--color-accent);
          outline: none;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
        }
        .ticket-form__textarea:disabled,
        .input:disabled { opacity: 0.6; }
        .ticket-form__title { font-size: 18px; }
        .ticket-form__actions { margin-top: var(--space-3); }
      `}</style>
    </section>
  );
}
