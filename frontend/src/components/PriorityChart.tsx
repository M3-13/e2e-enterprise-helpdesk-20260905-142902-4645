import type { Priority } from "../api/client";

interface PriorityChartProps {
  data: Record<Priority, number>;
}

interface PriorityMeta {
  key: Priority;
  label: string;
  colorVar: string;
}

const PRIORITIES: PriorityMeta[] = [
  { key: "critical", label: "Kritisch", colorVar: "--color-danger" },
  { key: "high", label: "Hoch", colorVar: "--color-warning" },
  { key: "medium", label: "Mittel", colorVar: "--color-accent" },
  { key: "low", label: "Niedrig", colorVar: "--color-muted" },
];

export default function PriorityChart({ data }: PriorityChartProps) {
  const max = Math.max(0, ...PRIORITIES.map((p) => data[p.key] ?? 0));

  return (
    <div className="chart">
      {PRIORITIES.map((p) => {
        const value = data[p.key] ?? 0;
        const width = max > 0 ? Math.round((value / max) * 100) : 0;
        return (
          <div className="chart__row" key={p.key}>
            <span className="chart__label">{p.label}</span>
            <div className="chart__track" role="presentation">
              <div
                className="chart__bar"
                style={{ width: `${width}%`, backgroundColor: `var(${p.colorVar})` }}
              />
            </div>
            <span className="chart__value">{value}</span>
          </div>
        );
      })}
    </div>
  );
}
