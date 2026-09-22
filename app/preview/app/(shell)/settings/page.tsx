"use client";

import { useState } from "react";
import { PageHeader } from "../../../_components/PageHeader";
import { Badge } from "../../../_components/Badge";

export default function FirmSettingsPage() {
  const [tab, setTab] = useState<"general" | "billing" | "integrations">("general");

  return (
    <>
      <PageHeader title="Settings" description="Firm profile, billing plan, and connected integrations." />

      <div className="preview-tabs">
        <button className={`preview-tab ${tab === "general" ? "preview-tab-active" : ""}`} onClick={() => setTab("general")}>General</button>
        <button className={`preview-tab ${tab === "billing" ? "preview-tab-active" : ""}`} onClick={() => setTab("billing")}>Plan & billing</button>
        <button className={`preview-tab ${tab === "integrations" ? "preview-tab-active" : ""}`} onClick={() => setTab("integrations")}>Integrations</button>
      </div>

      {tab === "general" && (
        <div className="preview-card">
          <h2 className="preview-card-title">Firm profile</h2>
          <div className="preview-field">
            <label htmlFor="fname">Firm name</label>
            <input id="fname" className="preview-input" defaultValue="Whitfield & Co Accountants" />
          </div>
          <div className="preview-field">
            <label htmlFor="femail">Billing email</label>
            <input id="femail" className="preview-input" defaultValue="billing@whitfieldco.uk" />
          </div>
          <button className="btn btn-primary">Save changes</button>
        </div>
      )}

      {tab === "billing" && (
        <div className="preview-card">
          <h2 className="preview-card-title">Current plan</h2>
          <p style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Badge tone="teal">Growth</Badge> £249/month · 6 of 20 clients used
          </p>
          <div className="preview-progress-track" style={{ margin: "10px 0 16px" }}>
            <div className="preview-progress-fill" style={{ width: "30%" }} />
          </div>
          <button className="btn">Upgrade plan</button>{" "}
          <button className="btn">View invoices</button>
        </div>
      )}

      {tab === "integrations" && (
        <div className="preview-card">
          <h2 className="preview-card-title">Connected services</h2>
          <ul className="preview-checklist">
            <li className="preview-checklist-item"><Badge tone="success">Connected</Badge> Open Banking — 4 client accounts</li>
            <li className="preview-checklist-item"><Badge tone="neutral">Not connected</Badge> Xero export</li>
            <li className="preview-checklist-item"><Badge tone="neutral">Not connected</Badge> QuickBooks export</li>
          </ul>
        </div>
      )}
    </>
  );
}
