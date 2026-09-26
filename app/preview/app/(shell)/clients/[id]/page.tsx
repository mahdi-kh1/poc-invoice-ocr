"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { PageHeader } from "../../../../_components/PageHeader";
import { Badge } from "../../../../_components/Badge";
import { CLIENT_STATUS_META, PROJECT_STATUS_META } from "../../../../_components/statusMeta";
import { CLIENTS, PROJECTS, DOCUMENTS } from "../../../../_lib/mock-data";
import { useT } from "../../../../_lib/i18n";

export default function ClientProfilePage() {
  const { t } = useT();
  const params = useParams<{ id: string }>();
  const client = CLIENTS.find((c) => c.id === params.id);
  if (!client) return notFound();

  const projects = PROJECTS.filter((p) => p.clientId === client.id);
  const docs = DOCUMENTS.filter((d) => d.clientName === client.name);

  return (
    <>
      <PageHeader
        title={client.name}
        description={`${t("page.clientDetail.desc")} — VAT ${client.vatNumber} · Company no. ${client.companyRegNumber}`}
        actions={
          <>
            <Badge tone={CLIENT_STATUS_META[client.status].tone}>{CLIENT_STATUS_META[client.status].label}</Badge>
            <button className="btn">Edit profile</button>
          </>
        }
      />

      <div className="preview-tabs">
        <span className="preview-tab preview-tab-active">Overview</span>
        <Link href={`/preview/app/clients/${client.id}/projects`} className="preview-tab" style={{ textDecoration: "none" }}>
          Projects ({projects.length})
        </Link>
      </div>

      <div className="preview-card-grid">
        <div className="preview-card">
          <h2 className="preview-card-title">Client details</h2>
          <dl className="detail-list">
            <div className="detail-row"><dt>VAT number</dt><dd>{client.vatNumber}</dd></div>
            <div className="detail-row"><dt>Company registration</dt><dd>{client.companyRegNumber}</dd></div>
            <div className="detail-row"><dt>Financial year end</dt><dd>{client.financialYearEnd}</dd></div>
            <div className="detail-row"><dt>VAT scheme</dt><dd>{client.vatScheme}</dd></div>
            <div className="detail-row"><dt>Contact email</dt><dd>{client.contactEmail}</dd></div>
            <div className="detail-row"><dt>Assigned team</dt><dd>{client.assignedTeam.join(", ")}</dd></div>
          </dl>
        </div>

        <div className="preview-card">
          <h2 className="preview-card-title">Connected bank accounts</h2>
          {client.connectedBanks.length === 0 ? (
            <p className="preview-page-desc">No bank accounts connected yet.</p>
          ) : (
            <ul className="preview-checklist">
              {client.connectedBanks.map((b) => (
                <li key={b} className="preview-checklist-item">
                  <span className="preview-checklist-check preview-checklist-check-done">✓</span>
                  {b}
                </li>
              ))}
            </ul>
          )}
          <button className="btn btn-small" style={{ marginTop: 12 }}>+ Connect another bank</button>
        </div>
      </div>

      <div className="preview-card">
        <h2 className="preview-card-title">Open projects</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Project</th><th>Due</th><th>Status</th><th>Assigned to</th></tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td className="cell-truncate"><Link href={`/preview/app/projects/${p.id}`}>{p.title}</Link></td>
                  <td className="cell-num">{p.dueDate}</td>
                  <td><Badge tone={PROJECT_STATUS_META[p.status].tone}>{PROJECT_STATUS_META[p.status].label}</Badge></td>
                  <td className="cell-truncate">{p.assignedTo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="preview-card">
        <h2 className="preview-card-title">Recent documents</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>File</th><th>Category</th><th>Uploaded</th></tr></thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id}>
                  <td className="cell-truncate">{d.fileName}</td>
                  <td className="cell-truncate">{d.category}</td>
                  <td className="cell-sublabel">{d.uploadedAt}</td>
                </tr>
              ))}
              {docs.length === 0 && (
                <tr className="empty-row"><td colSpan={3}>No documents uploaded for this client yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
