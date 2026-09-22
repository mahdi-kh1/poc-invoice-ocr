"use client";

import { PageHeader } from "../../../_components/PageHeader";
import { Badge } from "../../../_components/Badge";
import { INTERNAL_ROLES } from "../../../_lib/mock-data";

export default function InternalRolesPage() {
  return (
    <>
      <PageHeader
        title="Internal roles (RBAC)"
        description="Custom internal roles with precise, per-role permission assignment, independent of firm-side roles."
        actions={<button className="btn btn-primary">+ New role</button>}
      />

      <div className="preview-card-grid">
        {INTERNAL_ROLES.map((r) => (
          <div key={r.id} className="preview-card" style={{ marginBottom: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <h2 className="preview-card-title" style={{ marginBottom: 6 }}>{r.name}</h2>
              <Badge tone="teal">{r.memberCount} member{r.memberCount === 1 ? "" : "s"}</Badge>
            </div>
            <p className="preview-page-desc" style={{ marginBottom: 12 }}>{r.description}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {r.permissions.map((p) => (
                <Badge key={p} tone="neutral">{p}</Badge>
              ))}
            </div>
            <button className="btn btn-small" style={{ marginTop: 12 }}>Edit permissions</button>
          </div>
        ))}
      </div>
    </>
  );
}
