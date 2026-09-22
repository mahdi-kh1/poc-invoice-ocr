import type { NavGroup } from "../_components/Shell";

export const FIRM_NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/preview/app/dashboard", label: "Dashboard" }],
  },
  {
    label: "Clients",
    items: [{ href: "/preview/app/clients", label: "Clients" }],
  },
  {
    label: "Documents",
    items: [
      { href: "/preview/app/documents/upload", label: "Upload documents" },
      { href: "/preview/app/documents/review", label: "Review queue" },
      { href: "/preview/app/categories", label: "Categories" },
    ],
  },
  {
    label: "Money",
    items: [
      { href: "/preview/app/reconciliation", label: "Bank reconciliation" },
      { href: "/preview/app/tax-guidance", label: "Tax guidance" },
      { href: "/preview/app/reports", label: "Reports & exports" },
    ],
  },
  {
    label: "Firm",
    items: [
      { href: "/preview/app/assistant", label: "AI assistant" },
      { href: "/preview/app/team", label: "Team" },
      { href: "/preview/app/settings", label: "Settings" },
    ],
  },
];

export const ADMIN_NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/preview/admin/dashboard", label: "Dashboard" }],
  },
  {
    label: "Platform",
    items: [
      { href: "/preview/admin/firms", label: "Firms" },
      { href: "/preview/admin/users", label: "Global users" },
      { href: "/preview/admin/categories", label: "Categories" },
    ],
  },
  {
    label: "Product",
    items: [
      { href: "/preview/admin/ai-ops", label: "AI Ops" },
      { href: "/preview/admin/system-settings", label: "System settings" },
    ],
  },
  {
    label: "Business",
    items: [
      { href: "/preview/admin/billing", label: "Billing & subscriptions" },
      { href: "/preview/admin/analytics", label: "Reports & analytics" },
      { href: "/preview/admin/helpdesk", label: "Helpdesk" },
    ],
  },
  {
    label: "Security",
    items: [
      { href: "/preview/admin/audit-log", label: "Audit log" },
      { href: "/preview/admin/roles", label: "Internal roles" },
    ],
  },
];
