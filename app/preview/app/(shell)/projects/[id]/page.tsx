"use client";

import { useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { PageHeader } from "../../../../_components/PageHeader";
import { Badge } from "../../../../_components/Badge";
import { PROJECT_STATUS_META } from "../../../../_components/statusMeta";
import { PROJECTS } from "../../../../_lib/mock-data";
import type { ChecklistItem } from "../../../../_lib/types";

const PIPELINE = ["Not started", "In progress", "In review", "Done"];
const STATUS_TO_STEP: Record<string, number> = { not_started: 0, in_progress: 1, blocked: 1, review: 2, done: 3 };

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const base = PROJECTS.find((p) => p.id === params.id);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(base?.checklist ?? []);
  if (!base) return notFound();

  const step = STATUS_TO_STEP[base.status] ?? 0;
  const doneCount = checklist.filter((c) => c.done).length;

  return (
    <>
      <PageHeader
        title={base.title}
        description={`${base.kind} for ${base.clientName} · due ${base.dueDate} · assigned to ${base.assignedTo}`}
        actions={<Badge tone={PROJECT_STATUS_META[base.status].tone}>{PROJECT_STATUS_META[base.status].label}</Badge>}
      />

      <p className="preview-page-desc" style={{ marginBottom: 6 }}>
        <Link href={`/preview/app/clients/${base.clientId}/projects`}>← Back to {base.clientName}&apos;s projects</Link>
      </p>

      <div className="preview-card">
        <h2 className="preview-card-title">Pipeline</h2>
        <div className="preview-pipeline">
          {PIPELINE.map((label, i) => (
            <span key={label} style={{ display: "flex", alignItems: "center" }}>
              <span className="preview-pipeline-step">
                <span className={`preview-pipeline-node ${i <= step ? "preview-pipeline-node-active" : ""}`}>{i + 1}</span>
                {label}
              </span>
              {i < PIPELINE.length - 1 && <span className="preview-pipeline-arrow">→</span>}
            </span>
          ))}
        </div>
        {base.status === "blocked" && (
          <p style={{ marginTop: 10 }}>
            <Badge tone="danger">Blocked</Badge>{" "}
            <span className="preview-page-desc" style={{ display: "inline" }}>
              waiting on unresolved bank reconciliation items — see the Money section.
            </span>
          </p>
        )}
      </div>

      <div className="preview-card">
        <h2 className="preview-card-title">
          Checklist — {doneCount}/{checklist.length} complete
        </h2>
        <ul className="preview-checklist">
          {checklist.map((item, i) => (
            <li key={item.label} className="preview-checklist-item">
              <button
                type="button"
                className={`preview-checklist-check ${item.done ? "preview-checklist-check-done" : ""}`}
                onClick={() =>
                  setChecklist((prev) => prev.map((c, idx) => (idx === i ? { ...c, done: !c.done } : c)))
                }
                aria-pressed={item.done}
                aria-label={`Mark "${item.label}" ${item.done ? "not done" : "done"}`}
              >
                {item.done ? "✓" : ""}
              </button>
              <span className={item.done ? "preview-checklist-label-done" : ""}>{item.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
