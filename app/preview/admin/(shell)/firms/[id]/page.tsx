"use client";

import { useState } from "react";
import { notFound, useParams } from "next/navigation";
import { PageHeader } from "../../../../_components/PageHeader";
import { Badge } from "../../../../_components/Badge";
import { FIRM_STATUS_META } from "../../../../_components/statusMeta";
import { StatGrid, StatCard } from "../../../../_components/StatCard";
import { ADMIN_FIRMS } from "../../../../_lib/mock-data";

export default function AdminFirmDetailPage() {
  const params = useParams<{ id: string }>();
  const firm = ADMIN_FIRMS.find((f) => f.id === params.id);
  const [confirmImpersonate, setConfirmImpersonate] = useState(false);
  if (!firm) return notFound();

  return (
    <>
      <PageHeader
        title={firm.name}
        description={`Signed up ${firm.signedUpAt} · last active ${firm.lastActive}`}
        actions={
          <>
            <Badge tone={FIRM_STATUS_META[firm.status].tone}>{FIRM_STATUS_META[firm.status].label}</Badge>
            <button className="btn" onClick={() => setConfirmImpersonate(true)}>Impersonate</button>
            <button className="btn">Manual plan change</button>
            <button className="btn btn-danger">Suspend</button>
          </>
        }
      />

      <StatGrid>
        <StatCard label="Plan" value={firm.plan} sub={`£${firm.mrr}/mo`} />
        <StatCard label="Clients" value={`${firm.clients}`} sub={`${firm.usagePct}% of cap used`} />
        <StatCard label="Staff" value={String(firm.staff)} />
        <StatCard label="MRR" value={`£${firm.mrr}`} />
      </StatGrid>

      <div className="preview-card">
        <h2 className="preview-card-title">Usage vs cap</h2>
        <div className="preview-progress-track">
          <div className="preview-progress-fill" style={{ width: `${firm.usagePct}%` }} />
        </div>
        <p className="preview-page-desc" style={{ marginTop: 8 }}>{firm.usagePct}% of plan capacity used this month.</p>
      </div>

      <div className="preview-card">
        <h2 className="preview-card-title">Internal notes</h2>
        <p className="preview-page-desc">{firm.notes}</p>
        <button className="btn btn-small" style={{ marginTop: 8 }}>+ Add note</button>
      </div>

      <div className="preview-card">
        <h2 className="preview-card-title">Danger zone</h2>
        <div className="toolbar">
          <button className="btn">Extend trial</button>
          <button className="btn">Export data (GDPR)</button>
          <button className="btn btn-danger">Delete firm data</button>
        </div>
      </div>

      {confirmImpersonate && (
        <div className="preview-modal-overlay" onClick={() => setConfirmImpersonate(false)}>
          <div className="preview-modal-card preview-modal-card-narrow" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h2 className="dialog-title">Start impersonation session?</h2>
            </div>
            <div style={{ padding: 20 }}>
              <p className="preview-page-desc">
                This logs the session in the audit log and notifies {firm.name}&apos;s owner. Every
                action taken during impersonation is fully attributable to your admin account.
              </p>
              <div className="toolbar" style={{ marginTop: 12 }}>
                <button className="btn btn-primary" onClick={() => setConfirmImpersonate(false)}>Confirm & start</button>
                <button className="btn" onClick={() => setConfirmImpersonate(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
