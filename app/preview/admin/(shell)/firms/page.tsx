"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "../../../_components/PageHeader";
import { Badge, EmptyState } from "../../../_components/Badge";
import { FIRM_STATUS_META } from "../../../_components/statusMeta";
import { ADMIN_FIRMS } from "../../../_lib/mock-data";
import { useT } from "../../../_lib/i18n";

export default function AdminFirmsPage() {
  const { t } = useT();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const rows = useMemo(
    () =>
      ADMIN_FIRMS.filter((f) => {
        if (status !== "all" && f.status !== status) return false;
        if (q && !f.name.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      }),
    [q, status]
  );

  return (
    <>
      <PageHeader
        title={t("page.afirms.title")}
        description={t("page.afirms.desc")}
      />

      <div className="preview-filter-bar">
        <input className="preview-input preview-input-search" placeholder="Search firms…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="preview-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="trial">Trial</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No firms match" body="Try a different search or status filter." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Firm</th><th>Plan</th><th>Status</th><th>Clients</th><th>Staff</th><th>Usage</th><th>MRR</th><th>Last active</th></tr>
            </thead>
            <tbody>
              {rows.map((f) => (
                <tr key={f.id}>
                  <td className="cell-truncate"><Link href={`/preview/admin/firms/${f.id}`}>{f.name}</Link></td>
                  <td className="cell-truncate">{f.plan}</td>
                  <td><Badge tone={FIRM_STATUS_META[f.status].tone}>{FIRM_STATUS_META[f.status].label}</Badge></td>
                  <td className="cell-num">{f.clients}</td>
                  <td className="cell-num">{f.staff}</td>
                  <td className="cell-num">{f.usagePct}%</td>
                  <td className="cell-num">£{f.mrr}</td>
                  <td className="cell-sublabel">{f.lastActive}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
