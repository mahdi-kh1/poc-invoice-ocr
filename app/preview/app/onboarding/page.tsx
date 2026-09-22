"use client";

import { useState } from "react";
import "../../preview.css";

const STEPS = ["Firm details", "Invite your team", "Add first client"];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);

  return (
    <div className="preview-auth-shell">
      <div className="preview-auth-card" style={{ width: "min(92vw, 480px)" }}>
        <img src="/demo-accorix-logo.svg" alt="" className="preview-auth-logo" />
        <h1 className="preview-auth-title">{STEPS[step]}</h1>
        <p className="preview-auth-sub">
          Step {step + 1} of {STEPS.length} — set up your firm before your first client.
        </p>

        <div className="preview-onboarding-steps">
          {STEPS.map((s, i) => (
            <div key={s} className={`preview-onboarding-step ${i <= step ? "preview-onboarding-step-active" : ""}`} />
          ))}
        </div>

        {step === 0 && (
          <>
            <div className="preview-field">
              <label htmlFor="firmName">Firm name</label>
              <input id="firmName" className="preview-input" defaultValue="Whitfield & Co Accountants" />
            </div>
            <div className="preview-field">
              <label htmlFor="firmSize">Number of clients you manage</label>
              <select id="firmSize" className="preview-select" defaultValue="6-20">
                <option>1-5</option>
                <option>6-20</option>
                <option>21-60</option>
                <option>60+</option>
              </select>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="preview-field">
              <label htmlFor="inv1">Team member email</label>
              <input id="inv1" className="preview-input" defaultValue="priya@whitfieldco.uk" />
            </div>
            <div className="preview-field">
              <label htmlFor="inv2">Team member email</label>
              <input id="inv2" className="preview-input" defaultValue="tom@whitfieldco.uk" />
            </div>
            <button type="button" className="btn btn-small">+ Add another</button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="preview-field">
              <label htmlFor="clientName">Client name</label>
              <input id="clientName" className="preview-input" placeholder="Bramble & Sage Cafe Ltd" defaultValue="Bramble & Sage Cafe Ltd" />
            </div>
            <div className="preview-field">
              <label htmlFor="clientVat">VAT number (optional)</label>
              <input id="clientVat" className="preview-input" placeholder="GB 245 8891 33" />
            </div>
          </>
        )}

        <div className="toolbar" style={{ marginTop: 18, marginBottom: 0 }}>
          {step > 0 && (
            <button className="btn" onClick={() => setStep((s) => s - 1)}>
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button className="btn btn-primary" onClick={() => setStep((s) => s + 1)} style={{ flex: 1 }}>
              Continue
            </button>
          ) : (
            <a href="/preview/app/dashboard" className="btn btn-primary" style={{ flex: 1, textAlign: "center", textDecoration: "none" }}>
              Finish setup
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
