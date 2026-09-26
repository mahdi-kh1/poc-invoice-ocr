"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "../../../_components/PageHeader";
import { Badge, EmptyState } from "../../../_components/Badge";
import { TICKET_PRIORITY_META, TICKET_STATUS_META } from "../../../_components/statusMeta";
import { TICKETS } from "../../../_lib/mock-data";
import { useT } from "../../../_lib/i18n";

export default function HelpdeskPage() {
  const { t } = useT();
  const [status, setStatus] = useState("open");

  const rows = useMemo(
    () => TICKETS.filter((tk) => (status === "all" ? true : tk.status === status)).sort((a, b) => {
      const order = { urgent: 0, high: 1, normal: 2, low: 3 };
      return order[a.priority] - order[b.priority];
    }),
    [status]
  );

  return (
    <>
      <PageHeader
        title={t("page.helpdesk.title")}
        description={t("page.helpdesk.desc")}
      />

      <div className="preview-tabs">
        {(["open", "pending", "resolved", "all"] as const).map((s) => (
          <button key={s} className={`preview-tab ${status === s ? "preview-tab-active" : ""}`} onClick={() => setStatus(s)}>
            {s[0].toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="✓" title="Nothing here" body="No tickets in this state." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Firm</th><th>Plan</th><th>Subject</th><th>Priority</th><th>Status</th><th>Updated</th><th></th></tr></thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td className="cell-truncate">{t.firmName}</td>
                  <td className="cell-truncate">{t.plan}</td>
                  <td className="cell-truncate">{t.subject}</td>
                  <td><Badge tone={TICKET_PRIORITY_META[t.priority].tone}>{TICKET_PRIORITY_META[t.priority].label}</Badge></td>
                  <td><Badge tone={TICKET_STATUS_META[t.status].tone}>{TICKET_STATUS_META[t.status].label}</Badge></td>
                  <td className="cell-sublabel">{t.updatedAt}</td>
                  <td className="cell-num"><button className="btn btn-small">Open</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
