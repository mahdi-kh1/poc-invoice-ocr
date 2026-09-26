"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "../_lib/i18n";
import "../preview.css";

export interface NavItem {
  href: string;
  key: string;
}

export interface NavGroup {
  labelKey: string;
  items: NavItem[];
}

export function Shell({
  panel,
  navGroups,
  userLabel,
  userInitials,
  children,
}: {
  panel: "firm" | "admin";
  navGroups: NavGroup[];
  userLabel: string;
  userInitials: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t, locale, setLocale } = useT();
  const brandHref = panel === "firm" ? "/preview/app/dashboard" : "/preview/admin/dashboard";

  return (
    <div className="preview-shell" dir={locale === "fa" ? "rtl" : "ltr"} data-locale={locale}>
      <aside className="preview-sidebar">
        <Link href={brandHref} className="preview-sidebar-brand">
          <img src="/demo-accorix-logo.svg" alt="" />
          <span className="preview-sidebar-brand-text">
            <strong>Accorix</strong>
            <span>{panel === "firm" ? t("shell.firmPanel") : t("shell.adminPanel")}</span>
          </span>
        </Link>

        {navGroups.map((group) => (
          <nav key={group.labelKey} className="preview-nav-group" aria-label={t(group.labelKey)}>
            <div className="preview-nav-group-label">{t(group.labelKey)}</div>
            {group.items.map((item) => {
              const active = pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`preview-nav-link ${active ? "preview-nav-link-active" : ""}`}
                >
                  <span className="preview-nav-dot" aria-hidden="true" />
                  {t(item.key)}
                </Link>
              );
            })}
          </nav>
        ))}

        <div className="preview-sidebar-footer">
          <Link href="/preview/guide" className="preview-nav-link">
            <span className="preview-nav-dot" aria-hidden="true" />
            {t("shell.guide")}
          </Link>
          <Link
            href={panel === "firm" ? "/preview/admin/dashboard" : "/preview/app/dashboard"}
            className="preview-nav-link"
          >
            <span className="preview-nav-dot" aria-hidden="true" />
            {panel === "firm" ? t("shell.switchToAdmin") : t("shell.switchToFirm")}
          </Link>
          <Link href="/preview" className="preview-nav-link">
            <span className="preview-nav-dot" aria-hidden="true" />
            {t("shell.demoHub")}
          </Link>
        </div>
      </aside>

      <div className="preview-main">
        <header className="preview-topbar">
          <span className="preview-topbar-crumb">
            <strong>{panel === "firm" ? "Whitfield & Co Accountants" : "Accorix — Internal"}</strong>
            {panel === "firm" ? ` · ${t("shell.firmPanel")}` : ` · ${t("shell.adminPanel")}`}
          </span>
          <div className="preview-topbar-right">
            <button
              type="button"
              className="preview-lang-toggle"
              onClick={() => setLocale(locale === "fa" ? "en" : "fa")}
            >
              {t("lang.toggle")}
            </button>
            <span className="preview-mock-banner">{t("shell.mockBanner")}</span>
            <div className="preview-avatar" title={userLabel} aria-hidden="true">
              {userInitials}
            </div>
          </div>
        </header>
        <main id="main-content" className="preview-page">
          {children}
        </main>
      </div>
    </div>
  );
}
