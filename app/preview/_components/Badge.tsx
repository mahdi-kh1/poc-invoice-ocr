export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "accent2" | "gold" | "teal";

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: React.ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function EmptyState({ icon = "○", title, body }: { icon?: string; title: string; body?: string }) {
  return (
    <div className="preview-empty">
      <div className="preview-empty-icon" aria-hidden="true">{icon}</div>
      <p className="preview-empty-title">{title}</p>
      {body && <p className="preview-empty-body">{body}</p>}
    </div>
  );
}

export function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 85 ? "var(--success)" : value >= 60 ? "var(--warning)" : "var(--danger)";
  return (
    <span className="confidence-wrap">
      <span className="confidence-bar-track">
        <span className="confidence-bar-fill" style={{ width: `${Math.max(value, 3)}%`, background: color }} />
      </span>
      <span className="confidence-pct">{value}%</span>
    </span>
  );
}
