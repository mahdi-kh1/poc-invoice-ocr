"use client";

import { useState } from "react";
import { PageHeader } from "../../../_components/PageHeader";
import { Badge } from "../../../_components/Badge";
import { TEAM } from "../../../_lib/mock-data";
import { useT } from "../../../_lib/i18n";

export default function TeamPage() {
  const { t } = useT();
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <>
      <PageHeader
        title={t("page.team.title")}
        description={t("page.team.desc")}
        actions={<button className="btn btn-primary" onClick={() => setInviteOpen(true)}>{t("action.inviteTeamMember")}</button>}
      />

      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Clients assigned</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {TEAM.map((m) => (
              <tr key={m.id}>
                <td className="cell-truncate">{m.name}</td>
                <td className="cell-truncate">{m.email}</td>
                <td><Badge tone={m.role === "Owner" ? "gold" : "neutral"}>{m.role}</Badge></td>
                <td className="cell-num">{m.clientsAssigned}</td>
                <td><Badge tone={m.status === "active" ? "success" : "info"}>{m.status === "active" ? "Active" : "Invited"}</Badge></td>
                <td className="cell-num"><button className="btn btn-small">Manage</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {inviteOpen && (
        <div className="preview-modal-overlay" onClick={() => setInviteOpen(false)}>
          <div className="preview-modal-card preview-modal-card-narrow" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h2 className="dialog-title">Invite team member</h2>
              <button className="btn btn-icon" onClick={() => setInviteOpen(false)} aria-label="Close">✕</button>
            </div>
            <div style={{ padding: 20 }}>
              <div className="preview-field">
                <label htmlFor="inviteEmail">Email</label>
                <input id="inviteEmail" className="preview-input" placeholder="name@whitfieldco.uk" />
              </div>
              <div className="preview-field">
                <label htmlFor="inviteRole">Role</label>
                <select id="inviteRole" className="preview-select">
                  <option>Accountant</option>
                  <option>Bookkeeper</option>
                  <option>Manager</option>
                </select>
              </div>
              <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => setInviteOpen(false)}>
                Send invite
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
