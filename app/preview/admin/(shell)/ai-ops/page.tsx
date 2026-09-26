"use client";

import { PageHeader } from "../../../_components/PageHeader";
import { Badge } from "../../../_components/Badge";
import { AI_MODEL_STATUS_META } from "../../../_components/statusMeta";
import { AI_MODELS, ADMIN_FIRMS } from "../../../_lib/mock-data";
import { useT } from "../../../_lib/i18n";

export default function AiOpsPage() {
  const { t } = useT();
  return (
    <>
      <PageHeader
        title={t("page.aiops.title")}
        description={t("page.aiops.desc")}
      />

      <div className="preview-card">
        <h2 className="preview-card-title">Model registry</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Purpose</th><th>Provider / version</th><th>Cost / 1k docs</th><th>Accuracy</th><th>Manual correction rate</th><th>Status</th></tr></thead>
            <tbody>
              {AI_MODELS.map((m) => (
                <tr key={m.id}>
                  <td className="cell-truncate">{m.purpose}</td>
                  <td className="cell-truncate">{m.provider} — {m.version}</td>
                  <td className="cell-num">{m.costPer1kDocs === 0 ? "Free" : `£${m.costPer1kDocs.toFixed(2)}`}</td>
                  <td className="cell-num">{m.accuracyPct}%</td>
                  <td className="cell-num">{m.manualCorrectionRatePct}%</td>
                  <td><Badge tone={AI_MODEL_STATUS_META[m.status].tone}>{AI_MODEL_STATUS_META[m.status].label}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="preview-card-grid">
        <div className="preview-card">
          <h2 className="preview-card-title">Manual correction rate by firm</h2>
          {ADMIN_FIRMS.filter((f) => f.status === "active").map((f) => {
            const pct = 4 + (f.id.length * 3) % 14;
            return (
              <div key={f.id} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: 4 }}>
                  <span>{f.name}</span><span className="cell-sublabel">{pct}%</span>
                </div>
                <div className="preview-progress-track">
                  <div className="preview-progress-fill" style={{ width: `${pct * 4}%`, background: pct > 12 ? "var(--warning)" : "var(--accent-gradient)" }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="preview-card">
          <h2 className="preview-card-title">Prompt version A/B test</h2>
          <p className="preview-page-desc" style={{ marginBottom: 10 }}>
            Categorisation prompt v14 vs v15 — running since 8 Aug 2026.
          </p>
          <dl className="detail-list">
            <div className="detail-row"><dt>v14 (control)</dt><dd>91.8% accuracy · 52% traffic</dd></div>
            <div className="detail-row"><dt>v15 (candidate)</dt><dd>93.1% accuracy · 48% traffic</dd></div>
          </dl>
          <button className="btn btn-primary" style={{ marginTop: 10 }}>Promote v15 to 100%</button>
        </div>
      </div>
    </>
  );
}
