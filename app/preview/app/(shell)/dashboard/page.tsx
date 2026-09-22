"use client";

import Link from "next/link";
import { PageHeader } from "../../../_components/PageHeader";
import { StatGrid, StatCard } from "../../../_components/StatCard";
import { Badge } from "../../../_components/Badge";
import { PROJECT_STATUS_META, TAX_ALERT_META } from "../../../_components/statusMeta";
import { CLIENTS, PROJECTS, TAX_ALERTS, DOCUMENTS } from "../../../_lib/mock-data";

export default function FirmDashboardPage() {
  const upcoming = PROJECTS.filter((p) => p.status !== "done").slice(0, 6);
  const needsReview = DOCUMENTS.filter((d) => d.reviewState === "needs_review").length;

  return (
    <>
      <PageHeader
        title="Good morning, Elena"
        description="Here's what's moving across Whitfield & Co this week."
      />

      <StatGrid>
        <StatCard label="Active clients" value={String(CLIENTS.filter((c) => c.status === "active").length)} sub="+1 onboarding" />
        <StatCard label="Open projects" value={String(PROJECTS.filter((p) => p.status !== "done").length)} sub="3 due within 14 days" subTone="negative" />
        <StatCard label="Docs needing review" value={String(needsReview)} sub="Low-confidence fields" subTone="negative" />
        <StatCard label="VAT filed this quarter" value="1 of 4" sub="On track" subTone="positive" />
      </StatGrid>

      <div className="preview-card-grid">
        <div className="preview-card">
          <h2 className="preview-card-title">Projects in motion</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Project</th>
                  <th>Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((p) => (
                  <tr key={p.id}>
                    <td className="cell-truncate">{p.clientName}</td>
                    <td className="cell-truncate">{p.title}</td>
                    <td className="cell-num">{p.dueDate}</td>
                    <td>
                      <Badge tone={PROJECT_STATUS_META[p.status].tone}>{PROJECT_STATUS_META[p.status].label}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: 12 }}>
            <Link href="/preview/app/clients">View all clients →</Link>
          </p>
        </div>

        <div className="preview-card">
          <h2 className="preview-card-title">Tax alerts</h2>
          <ul className="preview-checklist">
            {TAX_ALERTS.slice(0, 4).map((a) => (
              <li key={a.id} className="preview-checklist-item" style={{ alignItems: "flex-start" }}>
                <Badge tone={TAX_ALERT_META[a.severity].tone}>{TAX_ALERT_META[a.severity].label}</Badge>
                <span>
                  <strong>{a.clientName}</strong> — {a.message}
                </span>
              </li>
            ))}
          </ul>
          <p style={{ marginTop: 12 }}>
            <Link href="/preview/app/tax-guidance">View all tax guidance →</Link>
          </p>
        </div>
      </div>
    </>
  );
}
