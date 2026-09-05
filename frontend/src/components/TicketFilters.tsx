import { useEffect, useRef, useState } from "react";
import { type Priority, type TicketStatus } from "../api/client";

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Offen",
  in_progress: "In Bearbeitung",
  resolved: "Gelöst",
  closed: "Geschlossen",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Niedrig",
  medium: "Mittel",
  high: "Hoch",
  critical: "Kritisch",
};

const STATUS_OPTIONS: { value: TicketStatus | ""; label: string }[] = [
  { value: "", label: "Alle Status" },
  { value: "open", label: STATUS_LABELS.open },
  { value: "in_progress", label: STATUS_LABELS.in_progress },
  { value: "resolved", label: STATUS_LABELS.resolved },
  { value: "closed", label: STATUS_LABELS.closed },
];

const PRIORITY_OPTIONS: { value: Priority | ""; label: string }[] = [
  { value: "", label: "Alle Prioritäten" },
  { value: "low", label: PRIORITY_LABELS.low },
  { value: "medium", label: PRIORITY_LABELS.medium },
  { value: "high", label: PRIORITY_LABELS.high },
  { value: "critical", label: PRIORITY_LABELS.critical },
];

interface TicketFiltersProps {
  search: string;
  status: TicketStatus | "";
  priority: Priority | "";
  assignee: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: TicketStatus | "") => void;
  onPriorityChange: (value: Priority | "") => void;
  onAssigneeChange: (value: string) => void;
  onReset: () => void;
}

export default function TicketFilters({
  search,
  status,
  priority,
  assignee,
  onSearchChange,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onReset,
}: TicketFiltersProps) {
  const [searchInput, setSearchInput] = useState(search);
  const debounceTimer = useRef<number | undefined>(undefined);
  const latestSearch = useRef(search);

  useEffect(() => {
    setSearchInput(search);
    latestSearch.current = search;
  }, [search]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current !== undefined) {
        window.clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const handleSearchChange = (next: string) => {
    setSearchInput(next);
    latestSearch.current = next;
    if (debounceTimer.current !== undefined) {
      window.clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = window.setTimeout(() => {
      onSearchChange(latestSearch.current);
    }, 300);
  };

  return (
    <form className="ticket-filters" onSubmit={(event) => event.preventDefault()}>
      <div className="ticket-filters__field ticket-filters__field--search">
        <label className="label" htmlFor="ticket-search">
          Suche
        </label>
        <input
          id="ticket-search"
          type="search"
          className="input"
          placeholder="Titel oder Beschreibung durchsuchen"
          value={searchInput}
          onChange={(event) => handleSearchChange(event.target.value)}
        />
      </div>

      <div className="ticket-filters__field">
        <label className="label" htmlFor="ticket-status">
          Status
        </label>
        <select
          id="ticket-status"
          className="input"
          value={status}
          onChange={(event) => onStatusChange(event.target.value as TicketStatus | "")}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="ticket-filters__field">
        <label className="label" htmlFor="ticket-priority">
          Priorität
        </label>
        <select
          id="ticket-priority"
          className="input"
          value={priority}
          onChange={(event) => onPriorityChange(event.target.value as Priority | "")}
        >
          {PRIORITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="ticket-filters__field">
        <label className="label" htmlFor="ticket-assignee">
          Zuständigkeit
        </label>
        <input
          id="ticket-assignee"
          type="text"
          className="input"
          placeholder="Name des Zuständigen"
          value={assignee}
          onChange={(event) => onAssigneeChange(event.target.value)}
        />
      </div>

      <div className="ticket-filters__actions">
        <button type="button" className="btn btn--secondary" onClick={onReset}>
          Zurücksetzen
        </button>
      </div>
    </form>
  );
}
