"use client";

import { useState } from "react";
import { useT } from "../../_lib/i18n";
import "../../preview.css";

const STEPS_EN = ["Firm details", "Invite your team", "Add first client"];
const STEPS_FA = ["اطلاعات شرکت", "دعوت تیم", "افزودن اولین مشتری"];

export default function OnboardingPage() {
  const { t, locale, setLocale } = useT();
  const fa = locale === "fa";
  const STEPS = fa ? STEPS_FA : STEPS_EN;
  const [step, setStep] = useState(0);

  return (
    <div className="preview-auth-shell" dir={fa ? "rtl" : "ltr"} data-locale={locale}>
      <div className="preview-auth-card" style={{ width: "min(92vw, 480px)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <img src="/demo-accorix-logo.svg" alt="" className="preview-auth-logo" style={{ marginBottom: 0 }} />
          <button type="button" className="preview-lang-toggle" onClick={() => setLocale(fa ? "en" : "fa")}>
            {t("lang.toggle")}
          </button>
        </div>
        <h1 className="preview-auth-title" style={{ marginTop: 14 }}>{STEPS[step]}</h1>
        <p className="preview-auth-sub">
          {fa
            ? `مرحله ${step + 1} از ${STEPS.length} — پیش از افزودن اولین مشتری، شرکت خود را راه‌اندازی کنید.`
            : `Step ${step + 1} of ${STEPS.length} — set up your firm before your first client.`}
        </p>

        <div className="preview-onboarding-steps">
          {STEPS.map((s, i) => (
            <div key={s} className={`preview-onboarding-step ${i <= step ? "preview-onboarding-step-active" : ""}`} />
          ))}
        </div>

        {step === 0 && (
          <>
            <div className="preview-field">
              <label htmlFor="firmName">{fa ? "نام شرکت" : "Firm name"}</label>
              <input id="firmName" className="preview-input" defaultValue="Whitfield & Co Accountants" />
            </div>
            <div className="preview-field">
              <label htmlFor="firmSize">{fa ? "تعداد مشتریانی که مدیریت می‌کنید" : "Number of clients you manage"}</label>
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
            <p className="preview-page-desc" style={{ marginBottom: 14 }}>
              {fa
                ? "هر عضو تیم یک ایمیل دعوت دریافت می‌کند، روی لینک کلیک می‌کند، رمز عبور می‌سازد و بلافاصله به داشبورد شرکت شما دسترسی پیدا می‌کند — به همان مشتری‌ها و پروژه‌هایی که شما می‌بینید."
                : "Each team member gets an invite email, clicks the link, sets a password, and immediately has access to your firm's dashboard — the same clients and projects you see."}
            </p>
            <div className="preview-field">
              <label htmlFor="inv1">{fa ? "ایمیل عضو تیم" : "Team member email"}</label>
              <input id="inv1" className="preview-input" defaultValue="priya@whitfieldco.uk" />
            </div>
            <div className="preview-field">
              <label htmlFor="inv2">{fa ? "ایمیل عضو تیم" : "Team member email"}</label>
              <input id="inv2" className="preview-input" defaultValue="tom@whitfieldco.uk" />
            </div>
            <button type="button" className="btn btn-small">{fa ? "+ افزودن نفر دیگر" : "+ Add another"}</button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="preview-field">
              <label htmlFor="clientName">{fa ? "نام مشتری" : "Client name"}</label>
              <input id="clientName" className="preview-input" placeholder="Bramble & Sage Cafe Ltd" defaultValue="Bramble & Sage Cafe Ltd" />
            </div>
            <div className="preview-field">
              <label htmlFor="clientVat">{fa ? "شماره مالیات بر ارزش‌افزوده (اختیاری)" : "VAT number (optional)"}</label>
              <input id="clientVat" className="preview-input" placeholder="GB 245 8891 33" />
            </div>
          </>
        )}

        <div className="toolbar" style={{ marginTop: 18, marginBottom: 0 }}>
          {step > 0 && (
            <button className="btn" onClick={() => setStep((s) => s - 1)}>
              {fa ? "بازگشت" : "Back"}
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button className="btn btn-primary" onClick={() => setStep((s) => s + 1)} style={{ flex: 1 }}>
              {fa ? "ادامه" : "Continue"}
            </button>
          ) : (
            <a href="/preview/app/dashboard" className="btn btn-primary" style={{ flex: 1, textAlign: "center", textDecoration: "none" }}>
              {fa ? "پایان راه‌اندازی" : "Finish setup"}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
