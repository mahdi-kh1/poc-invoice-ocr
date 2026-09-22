// Shared TypeScript shapes for the /preview UI-only demo (Firm-side + Admin-side, 27 pages per
// contract-and-planning/plan-accorix.md §2). Every value here is fake/mock data rendered
// client-side — there is no API, no database, no auth behind any of it. See mock-data.ts.

export type ClientStatus = "active" | "onboarding" | "paused";
export type VatScheme = "Standard" | "Flat Rate" | "Cash Accounting" | "Annual Accounting";

export interface ClientRecord {
  id: string;
  name: string;
  status: ClientStatus;
  vatNumber: string;
  companyRegNumber: string;
  financialYearEnd: string;
  vatScheme: VatScheme;
  connectedBanks: string[];
  contactEmail: string;
  assignedTeam: string[];
  openProjects: number;
  lastActivity: string;
}

export type ProjectKind = "VAT Quarter" | "Year-End Accounts" | "Monthly Bookkeeping" | "Payroll";
export type ProjectStatus = "not_started" | "in_progress" | "review" | "blocked" | "done";

export interface ChecklistItem {
  label: string;
  done: boolean;
}

export interface ProjectRecord {
  id: string;
  clientId: string;
  clientName: string;
  kind: ProjectKind;
  title: string;
  dueDate: string;
  status: ProjectStatus;
  checklist: ChecklistItem[];
  assignedTo: string;
}

export type DocReviewState = "queued" | "needs_review" | "approved";

export interface ExtractedField {
  label: string;
  value: string;
  confidence: number; // 0-100
}

export interface DocumentRecord {
  id: string;
  clientName: string;
  fileName: string;
  source: "Upload" | "Email" | "Mobile photo";
  uploadedAt: string;
  category: string;
  reviewState: DocReviewState;
  fields: ExtractedField[];
  thumbnailLabel: string;
}

export interface TeamMemberRecord {
  id: string;
  name: string;
  email: string;
  role: "Owner" | "Manager" | "Accountant" | "Bookkeeper";
  clientsAssigned: number;
  status: "active" | "invited";
}

export interface BankTransactionRecord {
  id: string;
  date: string;
  description: string;
  amount: number;
  direction: "in" | "out";
  matched: boolean;
  matchedDocument?: string;
  clientName: string;
}

export interface TaxAlertRecord {
  id: string;
  clientName: string;
  type: "VAT threshold" | "Scheme eligibility" | "Filing deadline" | "Tax-saving tip";
  message: string;
  severity: "info" | "warning" | "critical";
  dueDate?: string;
}

export interface ChatMessageRecord {
  id: string;
  role: "user" | "assistant";
  text: string;
  citedDocument?: string;
}

export interface ReportRecord {
  id: string;
  name: string;
  clientName: string;
  type: "P&L" | "Balance Sheet" | "Cash Flow" | "VAT Draft" | "Aged Debtors" | "Aged Creditors";
  period: string;
  generatedAt: string;
}

// --- Admin-side ---

export type FirmStatus = "trial" | "active" | "suspended" | "cancelled" | "overdue";

export interface AdminFirmRecord {
  id: string;
  name: string;
  plan: "Starter" | "Growth" | "Practice" | "Enterprise";
  status: FirmStatus;
  clients: number;
  staff: number;
  usagePct: number;
  mrr: number;
  signedUpAt: string;
  lastActive: string;
  notes: string;
}

export interface GlobalUserRecord {
  id: string;
  name: string;
  email: string;
  firmName: string;
  role: string;
  mfaEnabled: boolean;
  lastLogin: string;
  status: "active" | "blocked";
}

export interface AIModelRecord {
  id: string;
  purpose: "OCR" | "Categorisation" | "Chat assistant";
  provider: string;
  version: string;
  costPer1kDocs: number;
  accuracyPct: number;
  manualCorrectionRatePct: number;
  status: "production" | "shadow" | "deprecated";
}

export interface BillingPlanRecord {
  id: string;
  name: string;
  priceMonthly: number;
  clientCap: number;
  userCap: number;
  firmsOnPlan: number;
}

export interface InvoiceRecord {
  id: string;
  firmName: string;
  amount: number;
  status: "paid" | "pending" | "failed" | "refunded";
  issuedAt: string;
}

export interface RevenuePoint {
  month: string;
  mrr: number;
  newFirms: number;
  churnedFirms: number;
}

export interface FunnelStageRecord {
  stage: string;
  count: number;
}

export interface TicketRecord {
  id: string;
  firmName: string;
  subject: string;
  priority: "low" | "normal" | "high" | "urgent";
  plan: string;
  status: "open" | "pending" | "resolved";
  updatedAt: string;
}

export interface TaxRuleRecord {
  id: string;
  name: string;
  value: string;
  effectiveFrom: string;
  version: number;
}

export interface AuditLogEntry {
  id: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string;
  flagged: boolean;
}

export interface InternalRoleRecord {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  permissions: string[];
}
