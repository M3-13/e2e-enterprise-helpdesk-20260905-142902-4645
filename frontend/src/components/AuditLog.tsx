import type { AuditOut } from "../api/client";
import { formatDateTime } from "../lib/format";

const FIELD_LABELS: Record<string, string> = {
  title: "Titel",
  description: "Beschreibung",
  category: "Kategorie",
  priority: "Priorität",
  status: "Status",
  assignee_id: "Zuständigkeit",
};

interface AuditLogProps {
  audit: AuditOut[];
}

export default function AuditLog({ audit }: AuditLogProps) {
  return (
    <section className="card audit">
      <h2 className="audit__title">Änderungsprotokoll</h2>
      {audit.length === 0 ? (
        <p className="page__text">Noch keine Änderungen.</p>
      ) : (
        <ul className="audit__list">
          {audit.map((entry) => (
            <li key={entry.id} className="audit__entry">
              <div className="audit__meta">
                <span className="audit__field">
                  {FIELD_LABELS[entry.field] ?? entry.field}
                </span>
                <span className="audit__time">{formatDateTime(entry.created_at)}</span>
              </div>
              <div className="audit__change">
                <span className="audit__value">{entry.old_value ?? "—"}</span>
                <span className="audit__arrow" aria-hidden="true">
                  →
                </span>
                <span className="audit__value">{entry.new_value ?? "—"}</span>
              </div>
              <div className="audit__actor">von {entry.actor_name}</div>
            </li>
          ))}
        </ul>
      )}
      <style>{`
        .audit__title { font-size: 18px; }
        .audit__list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        .audit__entry {
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--space-2) var(--space-3);
        }
        .audit__meta {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: var(--space-2);
          margin-bottom: var(--space-0);
        }
        .audit__field { font-weight: 600; }
        .audit__time { font-size: 12px; color: var(--color-muted); }
        .audit__change {
          display: flex;
          align-items: center;
          gap: var(--space-1);
        }
        .audit__value {
          font-family: monospace;
          background-color: var(--color-surface_muted);
          border-radius: var(--radius-sm);
          padding: 2px 8px;
          font-size: 13px;
        }
        .audit__arrow { color: var(--color-muted); }
        .audit__actor { margin-top: var(--space-0); font-size: 12px; color: var(--color-muted); }
      `}</style>
    </section>
  );
}
