import type { Metadata } from "next";
import Link from "next/link";
import "./preview.css";

export const metadata: Metadata = {
  title: "Accorix — Full Product Demo",
  description: "UI-only walkthrough of all 27 pages of the Accorix product, ahead of Phase 1.",
};

export default function PreviewHubPage() {
  return (
    <div className="preview-auth-shell">
      <div className="preview-auth-card" style={{ width: "min(92vw, 640px)" }}>
        <img src="/demo-accorix-logo.svg" alt="" className="preview-auth-logo" />
        <h1 className="preview-auth-title">Full product demo — all 27 pages</h1>
        <p className="preview-auth-sub">
          This is a UI-only walkthrough of the complete Accorix product — every screen described in{" "}
          <Link href="/vision" target="_blank" rel="noopener noreferrer">the full vision</Link>, laid
          out with realistic mock data. Nothing here is wired to a real backend: no auth, no
          database, no persistence. It exists purely so you can click through the whole product
          before Phase 1 build starts. See{" "}
          <Link href="/" target="_blank" rel="noopener noreferrer">the live OCR tool</Link> for the
          one piece of this that&apos;s actually functional today.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Link href="/preview/app/login" className="btn btn-primary" style={{ textAlign: "center", textDecoration: "none" }}>
            Enter Firm panel (16 pages) →
          </Link>
          <Link href="/preview/admin/dashboard" className="btn" style={{ textAlign: "center", textDecoration: "none" }}>
            Enter Admin panel (11 pages) →
          </Link>
        </div>

        <p className="preview-page-desc" style={{ marginTop: 22 }}>
          <strong style={{ color: "var(--text)" }}>Firm panel</strong> — what an accounting practice
          and its staff use day to day: clients, projects, document review, reconciliation, reports.
          <br />
          <strong style={{ color: "var(--text)" }}>Admin panel</strong> — what Accorix staff use to
          run the platform: firms, billing, AI Ops, support, security.
        </p>
      </div>
    </div>
  );
}
