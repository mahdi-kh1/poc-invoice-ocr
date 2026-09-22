import type { BadgeTone } from "./Badge";

export const CLIENT_STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
  active: { label: "Active", tone: "success" },
  onboarding: { label: "Onboarding", tone: "info" },
  paused: { label: "Paused", tone: "neutral" },
};

export const PROJECT_STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
  not_started: { label: "Not started", tone: "neutral" },
  in_progress: { label: "In progress", tone: "info" },
  review: { label: "In review", tone: "accent2" },
  blocked: { label: "Blocked", tone: "danger" },
  done: { label: "Done", tone: "success" },
};

export const DOC_REVIEW_META: Record<string, { label: string; tone: BadgeTone }> = {
  queued: { label: "Queued", tone: "neutral" },
  needs_review: { label: "Needs review", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
};

export const FIRM_STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
  trial: { label: "Trial", tone: "info" },
  active: { label: "Active", tone: "success" },
  suspended: { label: "Suspended", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  overdue: { label: "Overdue", tone: "warning" },
};

export const TICKET_PRIORITY_META: Record<string, { label: string; tone: BadgeTone }> = {
  low: { label: "Low", tone: "neutral" },
  normal: { label: "Normal", tone: "info" },
  high: { label: "High", tone: "warning" },
  urgent: { label: "Urgent", tone: "danger" },
};

export const TICKET_STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
  open: { label: "Open", tone: "warning" },
  pending: { label: "Pending", tone: "info" },
  resolved: { label: "Resolved", tone: "success" },
};

export const INVOICE_STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
  paid: { label: "Paid", tone: "success" },
  pending: { label: "Pending", tone: "info" },
  failed: { label: "Failed", tone: "danger" },
  refunded: { label: "Refunded", tone: "neutral" },
};

export const TAX_ALERT_META: Record<string, { label: string; tone: BadgeTone }> = {
  info: { label: "Info", tone: "info" },
  warning: { label: "Warning", tone: "warning" },
  critical: { label: "Critical", tone: "danger" },
};

export const AI_MODEL_STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
  production: { label: "Production", tone: "success" },
  shadow: { label: "Shadow", tone: "info" },
  deprecated: { label: "Deprecated", tone: "neutral" },
};
