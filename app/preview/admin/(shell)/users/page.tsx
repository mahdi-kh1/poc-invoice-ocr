"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "../../../_components/PageHeader";
import { Badge, EmptyState } from "../../../_components/Badge";
import { GLOBAL_USERS } from "../../../_lib/mock-data";
import { useT } from "../../../_lib/i18n";

export default function GlobalUsersPage() {
  const { t } = useT();
  const [q, setQ] = useState("");

  const rows = useMemo(
    () => GLOBAL_USERS.filter((u) => !q || u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()) || u.firmName.toLowerCase().includes(q.toLowerCase())),
    [q]
  );

  return (
    <>
      <PageHeader
        title={t("page.ausers.title")}
        description={t("page.ausers.desc")}
      />

      <div className="preview-filter-bar">
        <input className="preview-input preview-input-search" placeholder="Search by name, email, or firm…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No users match" body="Try a different search." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Firm</th><th>Role</th><th>MFA</th><th>Last login</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td className="cell-truncate">{u.name}</td>
                  <td className="cell-truncate">{u.email}</td>
                  <td className="cell-truncate">{u.firmName}</td>
                  <td className="cell-truncate">{u.role}</td>
                  <td><Badge tone={u.mfaEnabled ? "success" : "warning"}>{u.mfaEnabled ? "Enabled" : "Off"}</Badge></td>
                  <td className="cell-sublabel">{u.lastLogin}</td>
                  <td><Badge tone={u.status === "active" ? "success" : "danger"}>{u.status === "active" ? "Active" : "Blocked"}</Badge></td>
                  <td className="cell-num">
                    <button className="btn btn-small">Reset password</button>{" "}
                    <button className="btn btn-small">Force logout</button>{" "}
                    <button className="btn btn-small btn-danger">Block</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
