"use client";

import { useState } from "react";
import { PageHeader } from "../../../_components/PageHeader";
import { Badge } from "../../../_components/Badge";
import { AUDIT_LOG } from "../../../_lib/mock-data";
import { useT } from "../../../_lib/i18n";

export default function AuditLogPage() {
  const { t } = useT();
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const rows = onlyFlagged ? AUDIT_LOG.filter((a) => a.flagged) : AUDIT_LOG;

  return (
    <>
      <PageHeader
        title={t("page.audit.title")}
        description={t("page.audit.desc")}
      />

      <div className="preview-filter-bar">
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem", color: "var(--text-muted)" }}>
          <input type="checkbox" checked={onlyFlagged} onChange={(e) => setOnlyFlagged(e.target.checked)} />
          {t("page.audit.onlyFlagged")}
        </label>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th><th></th></tr></thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td className="cell-sublabel">{a.timestamp}</td>
                <td className="cell-truncate">{a.actor}</td>
                <td className="cell-truncate">{a.action}</td>
                <td className="cell-truncate">{a.target}</td>
                <td>{a.flagged && <Badge tone="danger">Unusual pattern</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
