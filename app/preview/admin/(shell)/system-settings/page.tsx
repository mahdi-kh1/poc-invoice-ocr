"use client";

import { useState } from "react";
import { PageHeader } from "../../../_components/PageHeader";
import { Badge } from "../../../_components/Badge";
import { TAX_RULES } from "../../../_lib/mock-data";
import { useT } from "../../../_lib/i18n";

export default function SystemSettingsPage() {
  const { t } = useT();
  const [tab, setTab] = useState<"tax" | "integrations" | "api">("tax");

  return (
    <>
      <PageHeader
        title={t("page.sysset.title")}
        description={t("page.sysset.desc")}
      />

      <div className="preview-tabs">
        <button className={`preview-tab ${tab === "tax" ? "preview-tab-active" : ""}`} onClick={() => setTab("tax")}>Tax rules engine</button>
        <button className={`preview-tab ${tab === "integrations" ? "preview-tab-active" : ""}`} onClick={() => setTab("integrations")}>Integrations</button>
        <button className={`preview-tab ${tab === "api" ? "preview-tab-active" : ""}`} onClick={() => setTab("api")}>API keys</button>
      </div>

      {tab === "tax" && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Rule</th><th>Value</th><th>Effective from</th><th>Version</th><th></th></tr></thead>
            <tbody>
              {TAX_RULES.map((r) => (
                <tr key={r.id}>
                  <td className="cell-truncate">{r.name}</td>
                  <td className="cell-num">{r.value}</td>
                  <td className="cell-truncate">{r.effectiveFrom}</td>
                  <td className="cell-num">v{r.version}</td>
                  <td className="cell-num"><button className="btn btn-small">Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "integrations" && (
        <div className="preview-tile-grid">
          {[
            { name: "Xero", status: "Phase 2", tone: "neutral" as const },
            { name: "QuickBooks", status: "Phase 2", tone: "neutral" as const },
            { name: "HMRC / Making Tax Digital", status: "Phase 3", tone: "neutral" as const },
            { name: "Open Banking (TrueLayer)", status: "Connected", tone: "success" as const },
            { name: "Open Banking (Plaid)", status: "Available", tone: "info" as const },
          ].map((i) => (
            <div key={i.name} className="preview-tile">
              <div className="preview-tile-top">
                <span className="preview-tile-name">{i.name}</span>
                <Badge tone={i.tone}>{i.status}</Badge>
              </div>
              <button className="btn btn-small" style={{ marginTop: 8, alignSelf: "flex-start" }}>Configure</button>
            </div>
          ))}
        </div>
      )}

      {tab === "api" && (
        <div className="preview-card">
          <h2 className="preview-card-title">API keys</h2>
          <dl className="detail-list">
            <div className="detail-row"><dt>TrueLayer (Open Banking)</dt><dd>sk_live_•••••••••••••4f2a</dd></div>
            <div className="detail-row"><dt>Azure OpenAI Service</dt><dd>••••••••••••••••••••9c31</dd></div>
            <div className="detail-row"><dt>Azure AI Document Intelligence</dt><dd>••••••••••••••••••••1b08</dd></div>
          </dl>
          <button className="btn" style={{ marginTop: 12 }}>+ Add key</button>
        </div>
      )}
    </>
  );
}
