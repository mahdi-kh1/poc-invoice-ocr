import type { NavGroup } from "../_components/Shell";

export const FIRM_NAV: NavGroup[] = [
  {
    labelKey: "nav.overview",
    items: [{ href: "/preview/app/dashboard", key: "nav.dashboard" }],
  },
  {
    labelKey: "nav.clients",
    items: [{ href: "/preview/app/clients", key: "nav.clientsList" }],
  },
  {
    labelKey: "nav.documents",
    items: [
      { href: "/preview/app/documents/upload", key: "nav.uploadDocs" },
      { href: "/preview/app/documents/review", key: "nav.reviewQueue" },
      { href: "/preview/app/categories", key: "nav.categories" },
    ],
  },
  {
    labelKey: "nav.money",
    items: [
      { href: "/preview/app/reconciliation", key: "nav.reconciliation" },
      { href: "/preview/app/tax-guidance", key: "nav.taxGuidance" },
      { href: "/preview/app/reports", key: "nav.reports" },
    ],
  },
  {
    labelKey: "nav.firm",
    items: [
      { href: "/preview/app/assistant", key: "nav.assistant" },
      { href: "/preview/app/team", key: "nav.team" },
      { href: "/preview/app/settings", key: "nav.settings" },
    ],
  },
];

export const ADMIN_NAV: NavGroup[] = [
  {
    labelKey: "nav.overview",
    items: [{ href: "/preview/admin/dashboard", key: "nav.dashboard" }],
  },
  {
    labelKey: "nav.platform",
    items: [
      { href: "/preview/admin/firms", key: "nav.firms" },
      { href: "/preview/admin/users", key: "nav.users" },
      { href: "/preview/admin/categories", key: "nav.categories" },
    ],
  },
  {
    labelKey: "nav.product",
    items: [
      { href: "/preview/admin/ai-ops", key: "nav.aiOps" },
      { href: "/preview/admin/system-settings", key: "nav.systemSettings" },
    ],
  },
  {
    labelKey: "nav.business",
    items: [
      { href: "/preview/admin/billing", key: "nav.billing" },
      { href: "/preview/admin/analytics", key: "nav.analytics" },
      { href: "/preview/admin/helpdesk", key: "nav.helpdesk" },
    ],
  },
  {
    labelKey: "nav.security",
    items: [
      { href: "/preview/admin/audit-log", key: "nav.auditLog" },
      { href: "/preview/admin/roles", key: "nav.roles" },
    ],
  },
];
