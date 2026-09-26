"use client";

import { PageHeader } from "../../../_components/PageHeader";
import { Badge } from "../../../_components/Badge";
import { TAX_ALERT_META } from "../../../_components/statusMeta";
import { TAX_ALERTS, CLIENTS } from "../../../_lib/mock-data";
import { useT } from "../../../_lib/i18n";

export default function TaxGuidancePage() {
  const { t } = useT();
  return (
    <>
      <PageHeader
        title={t("page.tax.title")}
        description={t("page.tax.desc")}
      />

      <div className="preview-card" style={{ borderLeft: "3px solid var(--accent)" }}>
        <p className="preview-page-desc" style={{ margin: 0 }}>
          <strong style={{ color: "var(--text)" }}>{t("page.tax.humanLoop")}</strong> {t("page.tax.humanLoopBody")}
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
