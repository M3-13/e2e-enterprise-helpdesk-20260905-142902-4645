import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { api } from "../api/client";
import { useFeedback } from "../components/Feedback";
import TicketFilters from "../components/TicketFilters";
import TicketTable from "../components/TicketTable";
import { useAuth } from "../context/AuthContext";
import { PAGE_SIZES, useTickets } from "../hooks/useTickets";
import "./ticketlist.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

export default function TicketListPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <TicketListContent />
    </QueryClientProvider>
  );
}

function TicketListContent() {
  const { user } = useAuth();
  const { showSuccess, showError } = useFeedback();

  const {
    data,
    isLoading,
    filters,
    sort,
    page,
    pageSize,
    total,
    totalPages,
    setSearch,
    setStatus,
    setPriority,
    setAssignee,
    setSort,
    setPage,
    setPageSize,
    resetFilters,
  } = useTickets();

  const canExport = user?.role === "agent" || user?.role === "admin";
  const tickets = data?.items ?? [];

  async function handleExport() {
    try {
      const csv = await api.exportTickets({
        search: filters.search.trim() === "" ? undefined : filters.search.trim(),
        status: filters.status === "" ? undefined : filters.status,
        priority: filters.priority === "" ? undefined : filters.priority,
        assignee: filters.assignee.trim() === "" ? undefined : filters.assignee.trim(),
      });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "tickets.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showSuccess("Export heruntergeladen.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Export fehlgeschlagen.");
    }
  }

  return (
    <section className="page">
      <div className="page__header">
        <h1 className="page__title">Tickets</h1>
        {canExport && (
          <button type="button" className="btn btn--secondary" onClick={handleExport}>
            Export
          </button>
        )}
      </div>

      <TicketFilters
        search={filters.search}
        status={filters.status}
        priority={filters.priority}
        assignee={filters.assignee}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        onPriorityChange={setPriority}
        onAssigneeChange={setAssignee}
        onReset={resetFilters}
      />

      <TicketTable tickets={tickets} sort={sort} onSort={setSort} loading={isLoading} />

      <div className="pagination">
        <label className="pagination__pagesize">
          <span>Zeilen pro Seite</span>
          <select
            className="input"
            value={pageSize}
            onChange={(event) => setPageSize(Number(event.target.value))}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <span className="pagination__info">
          {total === 0
            ? "Keine Einträge"
            : `Seite ${page} von ${totalPages} · ${total} Tickets`}
        </span>
        <button
          type="button"
          className="pagination__btn"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          Zurück
        </button>
        <button
          type="button"
          className="pagination__btn"
          disabled={page >= totalPages}
          onClick={() => setPage(page + 1)}
        >
          Weiter
        </button>
      </div>
    </section>
  );
}
