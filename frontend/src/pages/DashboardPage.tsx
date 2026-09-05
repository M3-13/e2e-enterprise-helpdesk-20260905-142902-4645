import { useEffect, useState } from "react";
import { api, type DashboardStats } from "../api/client";
import PriorityChart from "../components/PriorityChart";

interface Metric {
  key: string;
  label: string;
  value: number;
  danger?: boolean;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .dashboard()
      .then((data) => {
        if (active) setStats(data);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Das Dashboard konnte nicht geladen werden.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const metrics: Metric[] = stats
    ? [
        { key: "open", label: "Offen", value: stats.open },
        { key: "overdue", label: "Überfällig", value: stats.overdue, danger: true },
        { key: "closed_today", label: "Heute geschlossen", value: stats.closed_today },
      ]
    : [];

  return (
    <section className="page">
      <h1 className="page__title">Dashboard</h1>

      {loading && <p className="dashboard__state">Dashboard wird geladen…</p>}

      {!loading && error && (
        <p className="dashboard__state dashboard__state--error" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && stats && (
        <>
          <div className="dashboard__grid">
            {metrics.map((m) => (
              <div
                key={m.key}
                className={`metric${m.danger ? " metric--danger" : ""}`}
              >
                <div className="metric__value">{m.value}</div>
                <div className="metric__label">{m.label}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <h2 className="chart__title">Prioritätsverteilung</h2>
            <PriorityChart data={stats.priority_distribution} />
          </div>
        </>
      )}
    </section>
  );
}
