import { type Category, type TicketOut } from "../api/client";
import { type TicketSort } from "../hooks/useTickets";
import { PRIORITY_LABELS, STATUS_LABELS } from "./TicketFilters";

export const CATEGORY_LABELS: Record<Category, string> = {
  hardware: "Hardware",
  software: "Software",
  network: "Netzwerk",
  access: "Zugriff",
  other: "Sonstiges",
};

interface SortableColumn {
  key: string;
  label: string;
  sortable: boolean;
}

const COLUMNS: SortableColumn[] = [
  { key: "title", label: "Titel", sortable: true },
  { key: "category", label: "Kategorie", sortable: true },
  { key: "priority", label: "Priorität", sortable: true },
  { key: "status", label: "Status", sortable: true },
  { key: "assignee_name", label: "Zuständigkeit", sortable: true },
  { key: "due_at", label: "Fälligkeit", sortable: true },
];

export function toggleSort(current: TicketSort, key: string): TicketSort {
  if (current.sort === key) {
    return { sort: key, order: current.order === "asc" ? "desc" : "asc" };
  }
  return { sort: key, order: "asc" };
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

interface TicketTableProps {
  tickets: TicketOut[];
  sort: TicketSort;
  onSort: (sort: TicketSort) => void;
  loading: boolean;
}

export default function TicketTable({ tickets, sort, onSort, loading }: TicketTableProps) {
  return (
    <div className="ticket-table">
      <table>
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <th key={column.key} aria-sort={sort.sort === column.key ? (sort.order === "asc" ? "ascending" : "descending") : undefined}>
                {column.sortable ? (
                  <button
                    type="button"
                    className="ticket-table__sort"
                    onClick={() => onSort(toggleSort(sort, column.key))}
                  >
                    <span>{column.label}</span>
                    {sort.sort === column.key && (
                      <span className="ticket-table__sort-indicator" aria-hidden="true">
                        {sort.order === "asc" ? "\u25B2" : "\u25BC"}
                      </span>
                    )}
                  </button>
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={COLUMNS.length} className="ticket-table__status">
                Lade Tickets&hellip;
              </td>
            </tr>
          ) : tickets.length === 0 ? (
            <tr>
              <td colSpan={COLUMNS.length} className="ticket-table__status">
                Keine Tickets gefunden.
              </td>
            </tr>
          ) : (
            tickets.map((ticket) => (
              <tr
                key={ticket.id}
                className={ticket.is_overdue ? "ticket-table__row--overdue" : undefined}
              >
                <td className="ticket-table__title">{ticket.title}</td>
                <td>{CATEGORY_LABELS[ticket.category]}</td>
                <td>
                  <span className={`badge badge--${ticket.priority}`}>
                    {PRIORITY_LABELS[ticket.priority]}
                  </span>
                </td>
                <td>
                  <span className={`badge badge--${ticket.status}`}>
                    {STATUS_LABELS[ticket.status]}
                  </span>
                </td>
                <td>{ticket.assignee_name ?? "\u2014"}</td>
                <td className="ticket-table__due">
                  {formatDate(ticket.due_at)}
                  {ticket.is_overdue && (
                    <span className="badge badge--overdue">Überfällig</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
