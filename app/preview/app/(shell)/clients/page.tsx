"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "../../../_components/PageHeader";
import { Badge } from "../../../_components/Badge";
import { CLIENT_STATUS_META } from "../../../_components/statusMeta";
import { EmptyState } from "../../../_components/Badge";
import { CLIENTS } from "../../../_lib/mock-data";
import { useT } from "../../../_lib/i18n";

export default function ClientsPage() {
  const { t } = useT();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    return CLIENTS.filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      if (q && !c.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [q, status]);

  return (
    <>
      <PageHeader
        title={t("page.clients.title")}
        description={t("page.clients.desc")}
        actions={<button className="btn btn-primary">{t("action.addClient")}</button>}
      />

      <div className="preview-filter-bar">
        <input
          className="preview-input preview-input-search"
          placeholder="Search clients…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="preview-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="onboarding">Onboarding</option>
          <option value="paused">Paused</option>
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Status</th>
              <th>VAT scheme</th>
              <th>Year end</th>
              <th>Team</th>
              <th>Open projects</th>
              <th>Last activity</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td className="cell-truncate">
                  <Link href={`/preview/app/clients/${c.id}`}>{c.name}</Link>
                </td>
                <td>
                  <Badge tone={CLIENT_STATUS_META[c.status].tone}>{CLIENT_STATUS_META[c.status].label}</Badge>
                </td>
                <td className="cell-truncate">{c.vatScheme}</td>
                <td className="cell-truncate">{c.financialYearEnd}</td>
                <td className="cell-truncate">{c.assignedTeam.join(", ")}</td>
                <td className="cell-num">{c.openProjects}</td>
                <td className="cell-truncate cell-sublabel">{c.lastActivity}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr className="empty-row">
                <td colSpan={7}>
                  <EmptyState title="No clients match" body="Try a different search or status filter." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
