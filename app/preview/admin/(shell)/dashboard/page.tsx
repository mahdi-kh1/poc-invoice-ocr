"use client";

import { PageHeader } from "../../../_components/PageHeader";
import { StatGrid, StatCard } from "../../../_components/StatCard";
import { Badge } from "../../../_components/Badge";
import { TICKET_PRIORITY_META } from "../../../_components/statusMeta";
import { ADMIN_FIRMS, REVENUE_SERIES, TICKETS } from "../../../_lib/mock-data";

export default function AdminDashboardPage() {
  const latest = REVENUE_SERIES[REVENUE_SERIES.length - 1];
  const maxMrr = Math.max(...REVENUE_SERIES.map((r) => r.mrr));
  const activeFirms = ADMIN_FIRMS.filter((f) => f.status === "active").length;
  const openTickets = TICKETS.filter((t) => t.status !== "resolved");

  return (
    <>
      <PageHeader title="Platform dashboard" description="Live KPIs across every firm on Accorix." />

      <StatGrid>
        <StatCard label="MRR" value={`£${latest.mrr.toLocaleString()}`} sub={`+£${latest.mrr - REVENUE_SERIES[REVENUE_SERIES.length - 2].mrr} vs last month`} subTone="positive" />
        <StatCard label="Active firms" value={String(activeFirms)} sub={`${ADMIN_FIRMS.filter((f) => f.status === "trial").length} in trial`} />
        <StatCard label="Churn (this month)" value={String(latest.churnedFirms)} subTone={latest.churnedFirms > 0 ? "negative" : "positive"} />
        <StatCard label="OCR volume today" value="1,284 docs" sub="Avg processing 3.4s" />
        <StatCard label="System health" value="99.96%" sub="0.4% OCR error rate" subTone="positive" />
        <StatCard label="Open support tickets" value={String(openTickets.length)} subTone={openTickets.length > 3 ? "negative" : undefined} />
      </StatGrid>

      <div className="preview-card-grid">
        <div className="preview-card">
          <h2 className="preview-card-title">MRR — last 6 months</h2>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 140 }}>
            {REVENUE_SERIES.map((r) => (
              <div key={r.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: "100%",
                    height: `${(r.mrr / maxMrr) * 110}px`,
                    background: "var(--accent-gradient)",
                    borderRadius: "4px 4px 0 0",
                  }}
                  title={`£${r.mrr}`}
                />
                <span className="cell-sublabel">{r.month}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="preview-card">
          <h2 className="preview-card-title">Needs attention</h2>
          <ul className="preview-checklist">
            {openTickets.slice(0, 4).map((t) => (
              <li key={t.id} className="preview-checklist-item" style={{ alignItems: "flex-start" }}>
                <Badge tone={TICKET_PRIORITY_META[t.priority].tone}>{TICKET_PRIORITY_META[t.priority].label}</Badge>
                <span>{t.firmName} — {t.subject}</span>
              </li>
            ))}
            {ADMIN_FIRMS.filter((f) => f.status === "overdue").map((f) => (
              <li key={f.id} className="preview-checklist-item">
                <Badge tone="warning">Overdue</Badge>
                <span>{f.name} — payment failed, dunning in progress</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
