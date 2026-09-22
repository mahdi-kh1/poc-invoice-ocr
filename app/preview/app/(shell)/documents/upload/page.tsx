"use client";

import { useState } from "react";
import { PageHeader } from "../../../../_components/PageHeader";
import { Badge } from "../../../../_components/Badge";
import { CLIENTS, DOCUMENTS } from "../../../../_lib/mock-data";

export default function UploadDocumentsPage() {
  const [dragging, setDragging] = useState(false);
  const [client, setClient] = useState(CLIENTS[0].id);
  const recent = DOCUMENTS.slice(0, 5);

  return (
    <>
      <PageHeader
        title="Upload documents"
        description="Drag and drop, or use a client's dedicated forwarding email, or snap a photo on mobile. Handwritten and low-quality scans are a first-class case here, not an edge case."
      />

      <div className="preview-card">
        <h2 className="preview-card-title">For client</h2>
        <select className="preview-select" value={client} onChange={(e) => setClient(e.target.value)} style={{ marginBottom: 16 }}>
          {CLIENTS.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); }}
          style={{
            border: `1px dashed ${dragging ? "var(--accent)" : "var(--border-strong)"}`,
            borderRadius: "var(--radius)",
            padding: "40px 20px",
            textAlign: "center",
            background: dragging ? "var(--surface-hover)" : "var(--surface)",
            transition: "border-color .15s ease, background-color .15s ease",
          }}
        >
          <p style={{ margin: "0 0 6px", fontWeight: 600 }}>Drop receipts, invoices, or bank statements here</p>
          <p className="preview-page-desc" style={{ margin: "0 0 14px" }}>PDF, JPG, PNG — or snap a photo from your phone</p>
          <button className="btn btn-primary" type="button">Browse files</button>
        </div>

        <div className="preview-card-grid" style={{ marginTop: 20 }}>
          <div>
            <h3 style={{ fontSize: "0.88rem", margin: "0 0 6px" }}>Dedicated forwarding email</h3>
            <p className="preview-page-desc">
              docs+{client}@inbox.accorix.io — forward any supplier email directly, attachments are
              picked up automatically.
            </p>
          </div>
          <div>
            <h3 style={{ fontSize: "0.88rem", margin: "0 0 6px" }}>Mobile photo</h3>
            <p className="preview-page-desc">
              Use the Accorix mobile capture link to snap and upload a receipt in under 10 seconds,
              no app install required.
            </p>
          </div>
        </div>
      </div>

      <div className="preview-card">
        <h2 className="preview-card-title">Recently uploaded</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>File</th><th>Client</th><th>Source</th><th>Uploaded</th><th></th></tr></thead>
            <tbody>
              {recent.map((d) => (
                <tr key={d.id}>
                  <td className="cell-truncate">{d.fileName}</td>
                  <td className="cell-truncate">{d.clientName}</td>
                  <td><Badge tone="neutral">{d.source}</Badge></td>
                  <td className="cell-sublabel">{d.uploadedAt}</td>
                  <td className="cell-num">
                    <span className="status-badge status-classify_done">extracted</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
