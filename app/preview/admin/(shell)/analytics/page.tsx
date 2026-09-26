"use client";

import { PageHeader } from "../../../_components/PageHeader";
import { StatGrid, StatCard } from "../../../_components/StatCard";
import { FUNNEL, REVENUE_SERIES, ADMIN_FIRMS } from "../../../_lib/mock-data";
import { useT } from "../../../_lib/i18n";

export default function AnalyticsPage() {
  const { t } = useT();
  const maxFunnel = FUNNEL[0].count;
  const totalNew = REVENUE_SERIES.reduce((s, r) => s + r.newFirms, 0);
  const totalChurn = REVENUE_SERIES.reduce((s, r) => s + r.churnedFirms, 0);

  return (
    <>
      <PageHeader title={t("page.analytics.title")} description={t("page.analytics.desc")} />

      <StatGrid>
        <StatCard label="Firms signed up (6mo)" value={String(totalNew)} />
        <StatCard label="Churned (6mo)" value={String(totalChurn)} subTone="negative" />
        <StatCard label="Net retention" value="108%" subTone="positive" />
        <StatCard label="Avg revenue per firm" value={`£${Math.round(ADMIN_FIRMS.reduce((s, f) => s + f.mrr, 0) / ADMIN_FIRMS.filter((f) => f.mrr > 0).length)}`} />
      </StatGrid>

      <div className="preview-card">
        <h2 className="preview-card-title">Signup → activation → payment funnel</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {FUNNEL.map((f) => (
            <div key={f.stage}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: 4 }}>
                <span>{f.stage}</span>
                <span className="cell-sublabel">{f.count} ({Math.round((f.count / maxFunnel) * 100)}%)</span>
              </div>
              <div className="preview-progress-track">
                <div className="preview-progress-fill" style={{ width: `${(f.count / maxFunnel) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="preview-card">
        <h2 className="preview-card-title">Cohort retention (signed up this year)</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Cohort</th><th>Month 1</th><th>Month 2</th><th>Month 3</th><th>Month 4</th></tr></thead>
            <tbody>
              {["Mar 2026", "Apr 2026", "May 2026", "Jun 2026"].map((c, i) => (
                <tr key={c}>
                  <td className="cell-truncate">{c}</td>
                  <td className="cell-num">100%</td>
                  <td className="cell-num">{92 - i * 2}%</td>
                  <td className="cell-num">{i < 3 ? 85 - i * 3 : "—"}%</td>
                  <td className="cell-num">{i < 2 ? 80 - i * 2 : "—"}{i < 2 && "%"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
