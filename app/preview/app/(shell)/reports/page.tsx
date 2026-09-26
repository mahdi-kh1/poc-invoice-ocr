"use client";

import { useState } from "react";
import { PageHeader } from "../../../_components/PageHeader";
import { Badge } from "../../../_components/Badge";
import { REPORTS, CLIENTS } from "../../../_lib/mock-data";
import { useT } from "../../../_lib/i18n";

const REPORT_TYPES = ["P&L", "Balance Sheet", "Cash Flow", "VAT Draft", "Aged Debtors", "Aged Creditors"] as const;

export default function ReportsPage() {
  const { t } = useT();
  const [client, setClient] = useState("all");
  const rows = client === "all" ? REPORTS : REPORTS.filter((r) => r.clientName === CLIENTS.find((c) => c.id === client)?.name);

  return (
    <>
      <PageHeader
        title={t("page.reports.title")}
        description={t("page.reports.desc")}
      />

      <div className="preview-card">
        <h2 className="preview-card-title">Generate a report</h2>
        <div className="preview-filter-bar" style={{ marginBottom: 0 }}>
          <select className="preview-select" value={client} onChange={(e) => setClient(e.target.value)}>
            <option value="all">All clients</option>
            {CLIENTS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="preview-select" defaultValue="P&L">
            {REPORT_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select className="preview-select" defaultValue="This quarter">
            <option>This month</option>
            <option>This quarter</option>
            <option>This year</option>
            <option>Custom range</option>
          </select>
          <button className="btn btn-primary">Generate</button>
        </div>
      </div>

      <div className="preview-card">
        <h2 className="preview-card-title">Recent reports</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Report</th><th>Client</th><th>Type</th><th>Period</th><th>Generated</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="cell-truncate">{r.name}</td>
                  <td className="cell-truncate">{r.clientName}</td>
                  <td><Badge tone="info">{r.type}</Badge></td>
                  <td className="cell-truncate">{r.period}</td>
                  <td className="cell-sublabel">{r.generatedAt}</td>
                  <td className="cell-num">
                    <button className="btn btn-small">Excel</button>{" "}
                    <button className="btn btn-small">PDF</button>{" "}
                    <button className="btn btn-small">CSV</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
