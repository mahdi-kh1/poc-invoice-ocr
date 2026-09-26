"use client";

import Link from "next/link";
import { useT } from "../../_lib/i18n";
import "../../preview.css";

export default function FirmLoginPage() {
  const { t, locale, setLocale } = useT();
  const fa = locale === "fa";

  return (
    <div className="preview-auth-shell" dir={fa ? "rtl" : "ltr"} data-locale={locale}>
      <div className="preview-auth-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <img src="/demo-accorix-logo.svg" alt="" className="preview-auth-logo" style={{ marginBottom: 0 }} />
          <button type="button" className="preview-lang-toggle" onClick={() => setLocale(fa ? "en" : "fa")}>
            {t("lang.toggle")}
          </button>
        </div>
        <h1 className="preview-auth-title" style={{ marginTop: 14 }}>{fa ? "ورود به Accorix" : "Sign in to Accorix"}</h1>
        <p className="preview-auth-sub">
          {fa ? "پنل شرکت — ورود نمایشی، بدون احراز هویت واقعی." : "Firm panel — mock login, no real authentication."}
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            window.location.href = "/preview/app/dashboard";
          }}
        >
          <div className="preview-field">
            <label htmlFor="email">{fa ? "ایمیل کاری" : "Work email"}</label>
            <input id="email" className="preview-input" type="email" placeholder="elena@whitfieldco.uk" defaultValue="elena@whitfieldco.uk" />
          </div>
          <div className="preview-field">
            <label htmlFor="password">{fa ? "رمز عبور" : "Password"}</label>
            <input id="password" className="preview-input" type="password" placeholder="••••••••" defaultValue="demo-password" />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: 4 }}>
            {fa ? "ورود" : "Sign in"}
          </button>
        </form>

        <p className="preview-page-desc" style={{ marginTop: 18, textAlign: "center" }}>
          {fa ? "شرکت جدید؟ " : "New firm? "}
          <Link href="/preview/app/onboarding">{fa ? "شروع ثبت‌نام" : "Start onboarding"}</Link>
          {" · "}
          <Link href="/preview/app/dashboard">{fa ? "رفتن مستقیم به داشبورد" : "Skip straight to dashboard"}</Link>
        </p>
      </div>
    </div>
  );
}
