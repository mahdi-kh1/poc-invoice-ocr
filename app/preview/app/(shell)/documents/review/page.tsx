"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "../../../../_components/PageHeader";
import { Badge, ConfidenceBar, EmptyState } from "../../../../_components/Badge";
import { DOC_REVIEW_META } from "../../../../_components/statusMeta";
import { DOCUMENTS } from "../../../../_lib/mock-data";
import type { DocumentRecord } from "../../../../_lib/types";

export default function ReviewQueuePage() {
  const [filter, setFilter] = useState<"all" | "needs_review">("needs_review");
  const [open, setOpen] = useState<DocumentRecord | null>(null);

  const rows = useMemo(
    () => DOCUMENTS.filter((d) => (filter === "all" ? true : d.reviewState === "needs_review")),
    [filter]
  );

  return (
    <>
      <PageHeader
        title="Review queue"
        description="Every extracted field carries a confidence score. Low-confidence fields are queued here for a quick human check instead of being silently accepted."
      />

      <div className="preview-tabs">
        <button className={`preview-tab ${filter === "needs_review" ? "preview-tab-active" : ""}`} onClick={() => setFilter("needs_review")}>
          Needs review ({DOCUMENTS.filter((d) => d.reviewState === "needs_review").length})
        </button>
        <button className={`preview-tab ${filter === "all" ? "preview-tab-active" : ""}`} onClick={() => setFilter("all")}>
          All documents ({DOCUMENTS.length})
        </button>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="✓" title="Review queue is empty" body="Nothing needs a human check right now." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>File</th><th>Client</th><th>Category</th><th>Lowest confidence field</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((d) => {
                const lowest = [...d.fields].sort((a, b) => a.confidence - b.confidence)[0];
                return (
                  <tr key={d.id}>
                    <td className="cell-truncate">{d.fileName}</td>
                    <td className="cell-truncate">{d.clientName}</td>
                    <td className="cell-truncate">{d.category}</td>
                    <td>
                      {lowest ? (
                        <span>
                          {lowest.label}: <ConfidenceBar value={lowest.confidence} />
                        </span>
                      ) : "—"}
                    </td>
                    <td><Badge tone={DOC_REVIEW_META[d.reviewState].tone}>{DOC_REVIEW_META[d.reviewState].label}</Badge></td>
                    <td className="cell-num">
                      <button className="btn btn-small" onClick={() => setOpen(d)}>Review</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="preview-modal-overlay" onClick={() => setOpen(null)}>
          <div className="preview-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h2 className="dialog-title">{open.fileName} — {open.clientName}</h2>
              <button className="btn btn-icon" onClick={() => setOpen(null)} aria-label="Close">✕</button>
            </div>
            <div className="dialog-content">
              <div className="dialog-image-panel">
                <div className="dialog-image-wrap">
                  <span className="dialog-image-placeholder">🧾 {open.thumbnailLabel}</span>
                </div>
              </div>
              <div className="dialog-fields-panel">
                <dl className="detail-list">
                  {open.fields.map((f) => (
                    <div key={f.label} className="detail-row">
                      <dt>{f.label}</dt>
                      <dd style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {f.value} <ConfidenceBar value={f.confidence} />
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="toolbar" style={{ marginTop: 16 }}>
                  <button className="btn btn-primary" onClick={() => setOpen(null)}>Approve</button>
                  <button className="btn" onClick={() => setOpen(null)}>Save corrections</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
