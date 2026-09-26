"use client";

import { useState } from "react";
import { PageHeader } from "../../../_components/PageHeader";
import { Badge } from "../../../_components/Badge";
import { FIRM_CATEGORIES } from "../../../_lib/mock-data";
import { useT } from "../../../_lib/i18n";

const TEMPLATES = ["Food retail", "Construction", "Restaurant", "Professional services", "Retail (general)"];

export default function AdminCategoriesPage() {
  const { t } = useT();
  const [tab, setTab] = useState<"defaults" | "templates">("defaults");

  return (
    <>
      <PageHeader
        title={t("page.acats.title")}
        description={t("page.acats.desc")}
        actions={<button className="btn btn-primary">{t("action.newCategory")}</button>}
      />

      <div className="preview-tabs">
        <button className={`preview-tab ${tab === "defaults" ? "preview-tab-active" : ""}`} onClick={() => setTab("defaults")}>System defaults</button>
        <button className={`preview-tab ${tab === "templates" ? "preview-tab-active" : ""}`} onClick={() => setTab("templates")}>Industry templates</button>
      </div>

      {tab === "defaults" ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Category</th><th>VAT code</th><th>Version</th><th>Used by</th><th></th></tr></thead>
            <tbody>
              {FIRM_CATEGORIES.map((c, i) => (
                <tr key={c}>
                  <td className="cell-truncate">{c}</td>
                  <td className="cell-truncate">T{(i % 4) + 1}</td>
                  <td className="cell-num">v{(i % 3) + 1}</td>
                  <td className="cell-num">{7 - (i % 7)} firms</td>
                  <td className="cell-num"><button className="btn btn-small">Rollback</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="preview-tile-grid">
          {TEMPLATES.map((t) => (
            <div key={t} className="preview-tile">
              <div className="preview-tile-top">
                <span className="preview-tile-name">{t}</span>
                <Badge tone="teal">Template</Badge>
              </div>
              <span className="preview-tile-meta">{6 + (t.length % 5)} categories</span>
              <button className="btn btn-small" style={{ marginTop: 8, alignSelf: "flex-start" }}>Preview</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
