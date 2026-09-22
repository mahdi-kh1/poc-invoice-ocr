export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="preview-stat-grid">{children}</div>;
}

export function StatCard({
  label,
  value,
  sub,
  subTone,
}: {
  label: string;
  value: string;
  sub?: string;
  subTone?: "positive" | "negative";
}) {
  return (
    <div className="preview-stat-card">
      <p className="preview-stat-label">{label}</p>
      <p className="preview-stat-value">{value}</p>
      {sub && (
        <p
          className={`preview-stat-sub ${
            subTone === "positive" ? "preview-stat-sub-positive" : subTone === "negative" ? "preview-stat-sub-negative" : ""
          }`}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
