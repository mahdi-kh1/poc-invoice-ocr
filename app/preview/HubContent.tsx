"use client";

import Link from "next/link";
import { useT } from "./_lib/i18n";

export function HubContent() {
  const { t, locale, setLocale } = useT();
  const dir = locale === "fa" ? "rtl" : "ltr";

  return (
    <div className="preview-auth-shell" dir={dir} data-locale={locale}>
      <div className="preview-auth-card" style={{ width: "min(92vw, 640px)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <img src="/demo-accorix-logo.svg" alt="" className="preview-auth-logo" style={{ marginBottom: 0 }} />
          <button type="button" className="preview-lang-toggle" onClick={() => setLocale(locale === "fa" ? "en" : "fa")}>
            {t("lang.toggle")}
          </button>
        </div>

        {locale === "fa" ? (
          <>
            <h1 className="preview-auth-title">دموی کامل محصول — همه ۲۷ صفحه</h1>
            <p className="preview-auth-sub">
              این یک نمایش کامل از رابط کاربری محصول Accorix است — همه صفحاتی که در{" "}
              <Link href="/vision" target="_blank" rel="noopener noreferrer">صفحه معرفی کامل</Link> شرح داده
              شده، با داده‌های نمایشی واقعی. هیچ‌کدام از این صفحات به بک‌اند واقعی وصل نیست: نه ورود واقعی،
              نه دیتابیس، نه ذخیره‌سازی. هدف این است که پیش از شروع ساخت واقعی فاز ۱، بتوانید کل محصول را
              ببینید و کلیک کنید. برای بخشی که واقعاً کار می‌کند به{" "}
              <Link href="/" target="_blank" rel="noopener noreferrer">ابزار OCR زنده</Link> سر بزنید.
            </p>
          </>
        ) : (
          <>
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
          </>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Link href="/preview/app/login" className="btn btn-primary" style={{ textAlign: "center", textDecoration: "none" }}>
            {locale === "fa" ? "← ورود به پنل شرکت (۱۶ صفحه)" : "Enter Firm panel (16 pages) →"}
          </Link>
          <Link href="/preview/admin/dashboard" className="btn" style={{ textAlign: "center", textDecoration: "none" }}>
            {locale === "fa" ? "← ورود به پنل مدیریت (۱۱ صفحه)" : "Enter Admin panel (11 pages) →"}
          </Link>
          <Link href="/preview/guide" className="btn" style={{ textAlign: "center", textDecoration: "none" }}>
            {locale === "fa" ? "📖 راهنما — همه چیز چطور کار می‌کند" : "📖 Guide — how everything works"}
          </Link>
        </div>

        <p className="preview-page-desc" style={{ marginTop: 22 }}>
          {locale === "fa" ? (
            <>
              <strong style={{ color: "var(--text)" }}>پنل شرکت</strong> — کاری که یک دفتر حسابداری و
              کارمندانش روزانه انجام می‌دهند: مشتریان، پروژه‌ها، بازبینی اسناد، تطبیق بانکی، گزارش‌ها.
              <br />
              <strong style={{ color: "var(--text)" }}>پنل مدیریت</strong> — کاری که تیم Accorix برای
              اداره کل پلتفرم انجام می‌دهد: شرکت‌ها، صورتحساب، هوش مصنوعی، پشتیبانی، امنیت.
            </>
          ) : (
            <>
              <strong style={{ color: "var(--text)" }}>Firm panel</strong> — what an accounting practice
              and its staff use day to day: clients, projects, document review, reconciliation, reports.
              <br />
              <strong style={{ color: "var(--text)" }}>Admin panel</strong> — what Accorix staff use to
              run the platform: firms, billing, AI Ops, support, security.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
