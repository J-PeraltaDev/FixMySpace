import type { ReactNode } from "react";

type MetricCardProps = {
  label: ReactNode;
  value: ReactNode;
  loading?: boolean;
};

export function MetricCard({ label, value, loading = false }: MetricCardProps) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong aria-busy={loading}>{loading ? "..." : value}</strong>
    </article>
  );
}
