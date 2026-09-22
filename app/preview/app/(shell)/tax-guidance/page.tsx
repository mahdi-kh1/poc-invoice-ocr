"use client";

import { PageHeader } from "../../../_components/PageHeader";
import { Badge } from "../../../_components/Badge";
import { TAX_ALERT_META } from "../../../_components/statusMeta";
import { TAX_ALERTS, CLIENTS } from "../../../_lib/mock-data";

export default function TaxGuidancePage() {
  return (
    <>
      <PageHeader
        title="Tax guidance"
        description="VAT-threshold monitoring, scheme-eligibility checks, deadline reminders, and tax-saving suggestions — all clearly labelled as suggestions an accountant reviews, never as decisions already made."
      />

      <div className="preview-card" style={{ borderLeft: "3px solid var(--accent)" }}>
        <p className="preview-page-desc" style={{ margin: 0 }}>
          <strong style={{ color: "var(--text)" }}>Human-in-the-loop, always.</strong> Nothing on this
          page files or finalises anything automatically — every item below is a draft suggestion
          for your team to review with the client.
        </p>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Client</th><th>Type</th><th>Details</th><th>Severity</th><th>Due</th></tr></thead>
          <tbody>
            {TAX_ALERTS.map((a) => (
              <tr key={a.id}>
                <td className="cell-truncate">{a.clientName}</td>
                <td className="cell-truncate">{a.type}</td>
                <td>{a.message}</td>
                <td><Badge tone={TAX_ALERT_META[a.severity].tone}>{TAX_ALERT_META[a.severity].label}</Badge></td>
                <td className="cell-num">{a.dueDate ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="preview-card">
        <h2 className="preview-card-title">VAT registration threshold — rolling 12-month turnover</h2>
        {CLIENTS.filter((c) => c.status !== "paused").map((c) => {
          const pct = Math.min(100, (parseInt(c.id.split("-")[1], 10) * 17) % 100);
          return (
            <div key={c.id} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: 4 }}>
                <span>{c.name}</span>
                <span className="cell-sublabel">{pct}% of £90,000</span>
              </div>
              <div className="preview-progress-track">
                <div className="preview-progress-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
