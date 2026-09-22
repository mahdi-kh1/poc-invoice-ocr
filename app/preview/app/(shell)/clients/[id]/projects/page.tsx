"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { PageHeader } from "../../../../../_components/PageHeader";
import { Badge, EmptyState } from "../../../../../_components/Badge";
import { PROJECT_STATUS_META } from "../../../../../_components/statusMeta";
import { CLIENTS, PROJECTS } from "../../../../../_lib/mock-data";

export default function ClientProjectsPage() {
  const params = useParams<{ id: string }>();
  const client = CLIENTS.find((c) => c.id === params.id);
  if (!client) return notFound();

  const projects = PROJECTS.filter((p) => p.clientId === client.id);

  return (
    <>
      <PageHeader
        title={`Projects — ${client.name}`}
        description="Every VAT quarter, year-end, and bookkeeping cycle tracked for this client, each moving through its own pipeline."
        actions={<button className="btn btn-primary">+ New project</button>}
      />

      <div className="preview-tabs">
        <Link href={`/preview/app/clients/${client.id}`} className="preview-tab" style={{ textDecoration: "none" }}>
          Overview
        </Link>
        <span className="preview-tab preview-tab-active">Projects ({projects.length})</span>
      </div>

      {projects.length === 0 ? (
        <EmptyState title="No projects yet" body="Create the first VAT quarter or bookkeeping cycle for this client." />
      ) : (
        <div className="preview-tile-grid">
          {projects.map((p) => (
            <Link key={p.id} href={`/preview/app/projects/${p.id}`} className="preview-tile" style={{ textDecoration: "none", color: "inherit" }}>
              <div className="preview-tile-top">
                <span className="preview-tile-name">{p.kind}</span>
                <Badge tone={PROJECT_STATUS_META[p.status].tone}>{PROJECT_STATUS_META[p.status].label}</Badge>
              </div>
              <span className="preview-tile-meta">{p.title}</span>
              <span className="preview-tile-meta">Due {p.dueDate} · {p.assignedTo}</span>
              <span className="preview-tile-meta">
                {p.checklist.filter((c) => c.done).length}/{p.checklist.length} checklist items done
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
