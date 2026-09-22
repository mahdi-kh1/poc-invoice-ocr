"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import "../preview.css";

export interface NavItem {
  href: string;
  label: string;
}

export interface NavGroup {
  label: string;
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
  const brandHref = panel === "firm" ? "/preview/app/dashboard" : "/preview/admin/dashboard";

  return (
    <div className="preview-shell">
      <aside className="preview-sidebar">
        <Link href={brandHref} className="preview-sidebar-brand">
          <img src="/demo-accorix-logo.svg" alt="" />
          <span className="preview-sidebar-brand-text">
            <strong>Accorix</strong>
            <span>{panel === "firm" ? "Firm panel" : "Admin panel"}</span>
          </span>
        </Link>

        {navGroups.map((group) => (
          <nav key={group.label} className="preview-nav-group" aria-label={group.label}>
            <div className="preview-nav-group-label">{group.label}</div>
            {group.items.map((item) => {
              const active = pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`preview-nav-link ${active ? "preview-nav-link-active" : ""}`}
                >
                  <span className="preview-nav-dot" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        ))}

        <div className="preview-sidebar-footer">
          <Link
            href={panel === "firm" ? "/preview/admin/dashboard" : "/preview/app/dashboard"}
            className="preview-nav-link"
          >
            <span className="preview-nav-dot" aria-hidden="true" />
            Switch to {panel === "firm" ? "Admin" : "Firm"} panel
          </Link>
          <Link href="/preview" className="preview-nav-link">
            <span className="preview-nav-dot" aria-hidden="true" />
            ← Demo hub
          </Link>
        </div>
      </aside>

      <div className="preview-main">
        <header className="preview-topbar">
          <span className="preview-topbar-crumb">
            <strong>{panel === "firm" ? "Whitfield & Co Accountants" : "Accorix — Internal"}</strong>
            {panel === "firm" ? " · Firm panel" : " · Admin panel"}
          </span>
          <div className="preview-topbar-right">
            <span className="preview-mock-banner">Mock data — nothing saved</span>
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
