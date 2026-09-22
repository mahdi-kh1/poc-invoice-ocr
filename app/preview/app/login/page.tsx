"use client";

import Link from "next/link";
import "../../preview.css";

export default function FirmLoginPage() {
  return (
    <div className="preview-auth-shell">
      <div className="preview-auth-card">
        <img src="/demo-accorix-logo.svg" alt="" className="preview-auth-logo" />
        <h1 className="preview-auth-title">Sign in to Accorix</h1>
        <p className="preview-auth-sub">Firm panel — mock login, no real authentication.</p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            window.location.href = "/preview/app/dashboard";
          }}
        >
          <div className="preview-field">
            <label htmlFor="email">Work email</label>
            <input id="email" className="preview-input" type="email" placeholder="elena@whitfieldco.uk" defaultValue="elena@whitfieldco.uk" />
          </div>
          <div className="preview-field">
            <label htmlFor="password">Password</label>
            <input id="password" className="preview-input" type="password" placeholder="••••••••" defaultValue="demo-password" />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: 4 }}>
            Sign in
          </button>
        </form>

        <p className="preview-page-desc" style={{ marginTop: 18, textAlign: "center" }}>
          New firm?{" "}
          <Link href="/preview/app/onboarding">Start onboarding</Link>
          {" · "}
          <Link href="/preview/app/dashboard">Skip straight to dashboard</Link>
        </p>
      </div>
    </div>
  );
}
