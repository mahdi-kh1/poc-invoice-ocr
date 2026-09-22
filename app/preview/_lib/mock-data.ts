// Fake/mock data for the /preview UI-only demo — every array here is hand-authored, static, and
// rendered as-is. Nothing is fetched, nothing is persisted, nothing is real. See CLAUDE.md /
// plan-accorix.md §2 for why this exists: a 27-page walkthrough of the full Accorix product for
// client sign-off, ahead of Phase 1's real build.

import type {
  ClientRecord,
  ProjectRecord,
  DocumentRecord,
  TeamMemberRecord,
  BankTransactionRecord,
  TaxAlertRecord,
  ChatMessageRecord,
  ReportRecord,
  AdminFirmRecord,
  GlobalUserRecord,
  AIModelRecord,
  BillingPlanRecord,
  InvoiceRecord,
  RevenuePoint,
  FunnelStageRecord,
  TicketRecord,
  TaxRuleRecord,
  AuditLogEntry,
  InternalRoleRecord,
} from "./types";

export const FIRM_NAME = "Whitfield & Co Accountants";

export const FIRM_CATEGORIES = [
  "Accountancy Fees", "Advertising and PR", "Bank Charges", "Computer Software",
  "Cost of Goods Sold", "Directors' Remuneration", "Entertainment (Non-allowable)",
  "Insurance", "Motor Expenses", "Office Supplies", "Postage and Courier", "Professional Fees",
  "Rent and Rates", "Repairs and Maintenance", "Staff Welfare", "Subsistence", "Telephone and Internet",
  "Travel", "Utilities", "VAT on Purchases",
];

export const CLIENTS: ClientRecord[] = [
  {
    id: "cl-1", name: "Bramble & Sage Cafe Ltd", status: "active", vatNumber: "GB 245 8891 33",
    companyRegNumber: "09234871", financialYearEnd: "31 March", vatScheme: "Flat Rate",
    connectedBanks: ["Starling Business"], contactEmail: "accounts@bramblesage.co.uk",
    assignedTeam: ["Priya Nair", "Tom Ashworth"], openProjects: 2, lastActivity: "2 hours ago",
  },
  {
    id: "cl-2", name: "Kestrel Builders Ltd", status: "active", vatNumber: "GB 198 3320 47",
    companyRegNumber: "08812345", financialYearEnd: "30 April", vatScheme: "Standard",
    connectedBanks: ["Barclays Business", "Revolut Business"], contactEmail: "finance@kestrelbuilders.co.uk",
    assignedTeam: ["Tom Ashworth"], openProjects: 3, lastActivity: "yesterday",
  },
  {
    id: "cl-3", name: "Nettle & Vine Florists", status: "onboarding", vatNumber: "Pending",
    companyRegNumber: "14456712", financialYearEnd: "31 December", vatScheme: "Cash Accounting",
    connectedBanks: [], contactEmail: "hello@nettlevine.co.uk",
    assignedTeam: ["Priya Nair"], openProjects: 1, lastActivity: "3 days ago",
  },
  {
    id: "cl-4", name: "Harrow Logistics Ltd", status: "active", vatNumber: "GB 301 7742 19",
    companyRegNumber: "07765432", financialYearEnd: "31 January", vatScheme: "Standard",
    connectedBanks: ["HSBC Business"], contactEmail: "ap@harrowlogistics.co.uk",
    assignedTeam: ["Tom Ashworth", "Priya Nair"], openProjects: 4, lastActivity: "5 hours ago",
  },
  {
    id: "cl-5", name: "The Gilded Frame Gallery", status: "paused", vatNumber: "GB 176 4420 88",
    companyRegNumber: "10098234", financialYearEnd: "30 June", vatScheme: "Flat Rate",
    connectedBanks: ["Monzo Business"], contactEmail: "owner@gildedframe.co.uk",
    assignedTeam: ["Priya Nair"], openProjects: 0, lastActivity: "3 weeks ago",
  },
  {
    id: "cl-6", name: "Solstice Fitness Studio", status: "active", vatNumber: "GB 289 1156 60",
    companyRegNumber: "11223344", financialYearEnd: "31 March", vatScheme: "Standard",
    connectedBanks: ["Starling Business", "Tide"], contactEmail: "money@solsticefit.co.uk",
    assignedTeam: ["Tom Ashworth"], openProjects: 2, lastActivity: "1 hour ago",
  },
];

export const PROJECTS: ProjectRecord[] = [
  { id: "pr-1", clientId: "cl-1", clientName: "Bramble & Sage Cafe Ltd", kind: "VAT Quarter", title: "VAT Q2 2026 (Apr–Jun)", dueDate: "2026-08-07", status: "in_progress", assignedTo: "Priya Nair",
    checklist: [{ label: "Collect all receipts", done: true }, { label: "Bank reconciliation", done: true }, { label: "Review flagged documents", done: false }, { label: "Draft VAT return", done: false }, { label: "Partner review", done: false }] },
  { id: "pr-2", clientId: "cl-1", clientName: "Bramble & Sage Cafe Ltd", kind: "Monthly Bookkeeping", title: "Bookkeeping — August 2026", dueDate: "2026-09-10", status: "not_started", assignedTo: "Tom Ashworth",
    checklist: [{ label: "Collect all receipts", done: false }, { label: "Bank reconciliation", done: false }, { label: "Categorise transactions", done: false }] },
  { id: "pr-3", clientId: "cl-2", clientName: "Kestrel Builders Ltd", kind: "Year-End Accounts", title: "Year-End Accounts 2025/26", dueDate: "2026-10-31", status: "review", assignedTo: "Tom Ashworth",
    checklist: [{ label: "Trial balance", done: true }, { label: "Fixed asset schedule", done: true }, { label: "Corporation tax computation", done: true }, { label: "Directors' sign-off", done: false }] },
  { id: "pr-4", clientId: "cl-2", clientName: "Kestrel Builders Ltd", kind: "VAT Quarter", title: "VAT Q2 2026 (Apr–Jun)", dueDate: "2026-08-07", status: "blocked", assignedTo: "Tom Ashworth",
    checklist: [{ label: "Collect all receipts", done: true }, { label: "Bank reconciliation", done: false }, { label: "Resolve 3 unmatched transactions", done: false }] },
  { id: "pr-5", clientId: "cl-2", clientName: "Kestrel Builders Ltd", kind: "Payroll", title: "Payroll — August 2026", dueDate: "2026-08-28", status: "not_started", assignedTo: "Priya Nair", checklist: [{ label: "Collect timesheets", done: false }, { label: "Run payroll", done: false }] },
  { id: "pr-6", clientId: "cl-3", clientName: "Nettle & Vine Florists", kind: "Monthly Bookkeeping", title: "Onboarding bookkeeping catch-up", dueDate: "2026-09-15", status: "in_progress", assignedTo: "Priya Nair",
    checklist: [{ label: "Import historic bank statements", done: true }, { label: "Chart of accounts setup", done: true }, { label: "Categorise backlog (6 months)", done: false }] },
  { id: "pr-7", clientId: "cl-4", clientName: "Harrow Logistics Ltd", kind: "VAT Quarter", title: "VAT Q2 2026 (Apr–Jun)", dueDate: "2026-08-07", status: "done", assignedTo: "Tom Ashworth",
    checklist: [{ label: "Collect all receipts", done: true }, { label: "Bank reconciliation", done: true }, { label: "Draft VAT return", done: true }, { label: "Filed", done: true }] },
  { id: "pr-8", clientId: "cl-4", clientName: "Harrow Logistics Ltd", kind: "Monthly Bookkeeping", title: "Bookkeeping — August 2026", dueDate: "2026-09-10", status: "in_progress", assignedTo: "Priya Nair", checklist: [{ label: "Collect receipts", done: true }, { label: "Categorise transactions", done: false }] },
  { id: "pr-9", clientId: "cl-6", clientName: "Solstice Fitness Studio", kind: "VAT Quarter", title: "VAT Q2 2026 (Apr–Jun)", dueDate: "2026-08-07", status: "review", assignedTo: "Tom Ashworth", checklist: [{ label: "Collect all receipts", done: true }, { label: "Bank reconciliation", done: true }, { label: "Partner review", done: false }] },
];

export const DOCUMENTS: DocumentRecord[] = [
  { id: "doc-1", clientName: "Bramble & Sage Cafe Ltd", fileName: "IMG_20260812_costco.jpg", source: "Mobile photo", uploadedAt: "12 Aug, 09:14", category: "Cost of Goods Sold", reviewState: "needs_review", thumbnailLabel: "Costco Receipt",
    fields: [{ label: "Vendor", value: "Costco Wholesale UK", confidence: 96 }, { label: "Date", value: "2026-08-12", confidence: 94 }, { label: "Total", value: "£412.60", confidence: 91 }, { label: "VAT", value: "£68.77", confidence: 58 }] },
  { id: "doc-2", clientName: "Kestrel Builders Ltd", fileName: "screwfix-invoice-4471.pdf", source: "Email", uploadedAt: "11 Aug, 16:40", category: "Repairs and Maintenance", reviewState: "approved", thumbnailLabel: "Screwfix Invoice",
    fields: [{ label: "Vendor", value: "Screwfix Direct Ltd", confidence: 99 }, { label: "Invoice #", value: "SF-4471829", confidence: 98 }, { label: "Total", value: "£1,204.99", confidence: 97 }, { label: "VAT", value: "£200.83", confidence: 97 }] },
  { id: "doc-3", clientName: "Harrow Logistics Ltd", fileName: "fuel-card-statement-jul.pdf", source: "Upload", uploadedAt: "10 Aug, 11:02", category: "Motor Expenses", reviewState: "needs_review", thumbnailLabel: "Fuel Statement",
    fields: [{ label: "Vendor", value: "Shell Fleet Solutions", confidence: 92 }, { label: "Period", value: "Jul 2026", confidence: 88 }, { label: "Total", value: "£2,940.12", confidence: 84 }, { label: "VAT", value: "£490.02", confidence: 41 }] },
  { id: "doc-4", clientName: "Solstice Fitness Studio", fileName: "IMG_20260809_supplements.jpg", source: "Mobile photo", uploadedAt: "9 Aug, 18:22", category: "Cost of Goods Sold", reviewState: "queued", thumbnailLabel: "Handwritten Receipt",
    fields: [{ label: "Vendor", value: "Fitness Supply Co", confidence: 67 }, { label: "Date", value: "2026-08-09", confidence: 52 }, { label: "Total", value: "£188.00", confidence: 73 }, { label: "VAT", value: "null", confidence: 0 }] },
  { id: "doc-5", clientName: "Bramble & Sage Cafe Ltd", fileName: "octopus-energy-aug.pdf", source: "Email", uploadedAt: "9 Aug, 08:10", category: "Utilities", reviewState: "approved", thumbnailLabel: "Energy Bill",
    fields: [{ label: "Vendor", value: "Octopus Energy", confidence: 99 }, { label: "Total", value: "£340.18", confidence: 98 }, { label: "VAT", value: "£16.20", confidence: 96 }] },
  { id: "doc-6", clientName: "Nettle & Vine Florists", fileName: "IMG_20260808_wholesaler.jpg", source: "Mobile photo", uploadedAt: "8 Aug, 07:55", category: "Cost of Goods Sold", reviewState: "needs_review", thumbnailLabel: "Flower Wholesaler",
    fields: [{ label: "Vendor", value: "New Covent Garden Flower Mkt", confidence: 81 }, { label: "Total", value: "£566.40", confidence: 77 }, { label: "VAT", value: "£94.40", confidence: 63 }] },
  { id: "doc-7", clientName: "Kestrel Builders Ltd", fileName: "travelodge-inv-2291.pdf", source: "Upload", uploadedAt: "7 Aug, 14:30", category: "Travel", reviewState: "queued", thumbnailLabel: "Hotel Invoice",
    fields: [{ label: "Vendor", value: "Travelodge UK", confidence: 95 }, { label: "Total", value: "£178.00", confidence: 93 }] },
  { id: "doc-8", clientName: "Harrow Logistics Ltd", fileName: "IMG_20260806_parking.jpg", source: "Mobile photo", uploadedAt: "6 Aug, 12:11", category: "Motor Expenses", reviewState: "needs_review", thumbnailLabel: "Parking Ticket",
    fields: [{ label: "Vendor", value: "NCP Car Parks", confidence: 71 }, { label: "Total", value: "£14.50", confidence: 69 }] },
];

export const TEAM: TeamMemberRecord[] = [
  { id: "tm-1", name: "Priya Nair", email: "priya@whitfieldco.uk", role: "Manager", clientsAssigned: 4, status: "active" },
  { id: "tm-2", name: "Tom Ashworth", email: "tom@whitfieldco.uk", role: "Accountant", clientsAssigned: 4, status: "active" },
  { id: "tm-3", name: "Elena Whitfield", email: "elena@whitfieldco.uk", role: "Owner", clientsAssigned: 6, status: "active" },
  { id: "tm-4", name: "Josh Carrington", email: "josh@whitfieldco.uk", role: "Bookkeeper", clientsAssigned: 0, status: "invited" },
];

export const BANK_TRANSACTIONS: BankTransactionRecord[] = [
  { id: "bt-1", date: "12 Aug", description: "COSTCO WHOLESALE UK", amount: 412.6, direction: "out", matched: true, matchedDocument: "IMG_20260812_costco.jpg", clientName: "Bramble & Sage Cafe Ltd" },
  { id: "bt-2", date: "11 Aug", description: "SCREWFIX DIRECT LTD", amount: 1204.99, direction: "out", matched: true, matchedDocument: "screwfix-invoice-4471.pdf", clientName: "Kestrel Builders Ltd" },
  { id: "bt-3", date: "10 Aug", description: "FASTER PAYMENT — SQUARE INC", amount: 3140.0, direction: "in", matched: false, clientName: "Bramble & Sage Cafe Ltd" },
  { id: "bt-4", date: "10 Aug", description: "SHELL FLEET SOLUTIONS", amount: 2940.12, direction: "out", matched: true, matchedDocument: "fuel-card-statement-jul.pdf", clientName: "Harrow Logistics Ltd" },
  { id: "bt-5", date: "8 Aug", description: "DIRECT DEBIT — UNKNOWN REF 88213", amount: 89.99, direction: "out", matched: false, clientName: "Kestrel Builders Ltd" },
  { id: "bt-6", date: "7 Aug", description: "NEW COVENT GARDEN FLOWER MKT", amount: 566.4, direction: "out", matched: true, matchedDocument: "IMG_20260808_wholesaler.jpg", clientName: "Nettle & Vine Florists" },
  { id: "bt-7", date: "6 Aug", description: "CARD PAYMENT — CLIENT INVOICE #2291", amount: 890.0, direction: "in", matched: false, clientName: "Kestrel Builders Ltd" },
];

export const TAX_ALERTS: TaxAlertRecord[] = [
  { id: "ta-1", clientName: "Nettle & Vine Florists", type: "VAT threshold", message: "Rolling 12-month turnover is £86,400 — within £3,600 of the £90,000 VAT registration threshold.", severity: "warning" },
  { id: "ta-2", clientName: "Bramble & Sage Cafe Ltd", type: "Filing deadline", message: "VAT Q2 2026 return due in 12 days.", severity: "info", dueDate: "2026-08-07" },
  { id: "ta-3", clientName: "Kestrel Builders Ltd", type: "Scheme eligibility", message: "Flat Rate Scheme may now be less favourable than Standard given current input VAT levels — worth reviewing with the client.", severity: "info" },
  { id: "ta-4", clientName: "Harrow Logistics Ltd", type: "Filing deadline", message: "Corporation tax payment due in 9 days.", severity: "critical", dueDate: "2026-09-01" },
  { id: "ta-5", clientName: "Solstice Fitness Studio", type: "Tax-saving tip", message: "Annual Investment Allowance not yet claimed on £4,200 of gym equipment purchased this year.", severity: "info" },
];

export const CHAT_HISTORY: ChatMessageRecord[] = [
  { id: "cm-1", role: "user", text: "What was Bramble & Sage's biggest expense category last quarter?" },
  { id: "cm-2", role: "assistant", text: "Cost of Goods Sold was the largest category for Bramble & Sage Cafe Ltd in Q2 2026, at £8,140.22 across 34 transactions — mostly wholesale food and drink suppliers.", citedDocument: "34 transactions, Q2 2026 ledger" },
  { id: "cm-3", role: "user", text: "Are there any documents still waiting on human review for Harrow Logistics?" },
  { id: "cm-4", role: "assistant", text: "Yes — 1 document: fuel-card-statement-jul.pdf, flagged because the extracted VAT amount has only 41% confidence. Worth a quick check before it's included in the VAT draft.", citedDocument: "fuel-card-statement-jul.pdf" },
];

export const REPORTS: ReportRecord[] = [
  { id: "rp-1", name: "P&L — Q2 2026", clientName: "Bramble & Sage Cafe Ltd", type: "P&L", period: "Apr–Jun 2026", generatedAt: "1 Aug 2026" },
  { id: "rp-2", name: "VAT Draft — Q2 2026", clientName: "Harrow Logistics Ltd", type: "VAT Draft", period: "Apr–Jun 2026", generatedAt: "3 Aug 2026" },
  { id: "rp-3", name: "Balance Sheet — FYE Apr 2026", clientName: "Kestrel Builders Ltd", type: "Balance Sheet", period: "May 2025–Apr 2026", generatedAt: "28 Jul 2026" },
  { id: "rp-4", name: "Aged Debtors — Aug 2026", clientName: "Kestrel Builders Ltd", type: "Aged Debtors", period: "as at 12 Aug 2026", generatedAt: "12 Aug 2026" },
  { id: "rp-5", name: "Cash Flow — YTD", clientName: "Solstice Fitness Studio", type: "Cash Flow", period: "Jan–Aug 2026", generatedAt: "5 Aug 2026" },
];

// ---------------------------------------------------------------------------
// Admin-side mock data
// ---------------------------------------------------------------------------

export const ADMIN_FIRMS: AdminFirmRecord[] = [
  { id: "fm-1", name: "Whitfield & Co Accountants", plan: "Growth", status: "active", clients: 6, staff: 4, usagePct: 74, mrr: 249, signedUpAt: "14 Feb 2025", lastActive: "2 hours ago", notes: "Primary demo firm; consistently high engagement." },
  { id: "fm-2", name: "Northgate Bookkeeping", plan: "Starter", status: "trial", clients: 2, staff: 1, usagePct: 22, mrr: 0, signedUpAt: "3 Aug 2026", lastActive: "1 day ago", notes: "Trial ends in 9 days; hasn't connected a bank feed yet." },
  { id: "fm-3", name: "Aldergate Practice LLP", plan: "Practice", status: "active", clients: 34, staff: 11, usagePct: 91, mrr: 899, signedUpAt: "9 Sep 2024", lastActive: "18 minutes ago", notes: "Approaching client cap on current plan — good upsell candidate." },
  { id: "fm-4", name: "Fenwick Accounting Services", plan: "Starter", status: "overdue", clients: 3, staff: 2, usagePct: 40, mrr: 49, signedUpAt: "20 Nov 2025", lastActive: "6 days ago", notes: "Payment failed twice; dunning in progress." },
  { id: "fm-5", name: "Priory Tax & Advisory", plan: "Growth", status: "suspended", clients: 8, staff: 3, usagePct: 0, mrr: 249, signedUpAt: "2 Jan 2025", lastActive: "31 days ago", notes: "Suspended after GDPR data-export request — pending resolution." },
  { id: "fm-6", name: "Clearwater Chartered", plan: "Enterprise", status: "active", clients: 61, staff: 19, usagePct: 68, mrr: 1899, signedUpAt: "5 May 2024", lastActive: "9 minutes ago", notes: "Largest firm on the platform; custom SLA." },
  { id: "fm-7", name: "Marsh & Delaney", plan: "Starter", status: "cancelled", clients: 0, staff: 1, usagePct: 0, mrr: 0, signedUpAt: "12 Mar 2025", lastActive: "94 days ago", notes: "Cancelled — moved to a competitor after a 2-month trial." },
];

export const GLOBAL_USERS: GlobalUserRecord[] = [
  { id: "gu-1", name: "Elena Whitfield", email: "elena@whitfieldco.uk", firmName: "Whitfield & Co Accountants", role: "Owner", mfaEnabled: true, lastLogin: "2 hours ago", status: "active" },
  { id: "gu-2", name: "Priya Nair", email: "priya@whitfieldco.uk", firmName: "Whitfield & Co Accountants", role: "Manager", mfaEnabled: true, lastLogin: "3 hours ago", status: "active" },
  { id: "gu-3", name: "Dev Patel", email: "dev@northgatebk.co.uk", firmName: "Northgate Bookkeeping", role: "Owner", mfaEnabled: false, lastLogin: "1 day ago", status: "active" },
  { id: "gu-4", name: "Rosalind Marsh", email: "r.marsh@aldergatepractice.co.uk", firmName: "Aldergate Practice LLP", role: "Manager", mfaEnabled: true, lastLogin: "18 minutes ago", status: "active" },
  { id: "gu-5", name: "Callum Fenwick", email: "callum@fenwickaccounting.co.uk", firmName: "Fenwick Accounting Services", role: "Owner", mfaEnabled: false, lastLogin: "6 days ago", status: "active" },
  { id: "gu-6", name: "Unknown Session — flagged", email: "temp-847@priorytax.co.uk", firmName: "Priory Tax & Advisory", role: "Bookkeeper", mfaEnabled: false, lastLogin: "31 days ago", status: "blocked" },
];

export const AI_MODELS: AIModelRecord[] = [
  { id: "ai-1", purpose: "OCR", provider: "Azure AI Document Intelligence", version: "prebuilt-invoice v4.0", costPer1kDocs: 12.5, accuracyPct: 96.2, manualCorrectionRatePct: 4.1, status: "production" },
  { id: "ai-2", purpose: "Categorisation", provider: "Azure OpenAI Service", version: "gpt-4o-mini (2026-03)", costPer1kDocs: 3.1, accuracyPct: 91.8, manualCorrectionRatePct: 8.4, status: "production" },
  { id: "ai-3", purpose: "Categorisation", provider: "Azure OpenAI Service", version: "gpt-4o (2026-06) — shadow", costPer1kDocs: 9.4, accuracyPct: 94.6, manualCorrectionRatePct: 5.9, status: "shadow" },
  { id: "ai-4", purpose: "Chat assistant", provider: "Azure OpenAI Service", version: "gpt-4o (2026-06)", costPer1kDocs: 0, accuracyPct: 89.0, manualCorrectionRatePct: 0, status: "production" },
  { id: "ai-5", purpose: "OCR", provider: "Tesseract.js (local)", version: "POC fallback", costPer1kDocs: 0, accuracyPct: 78.4, manualCorrectionRatePct: 21.6, status: "deprecated" },
];

export const BILLING_PLANS: BillingPlanRecord[] = [
  { id: "bp-1", name: "Starter", priceMonthly: 49, clientCap: 5, userCap: 2, firmsOnPlan: 3 },
  { id: "bp-2", name: "Growth", priceMonthly: 249, clientCap: 20, userCap: 6, firmsOnPlan: 2 },
  { id: "bp-3", name: "Practice", priceMonthly: 899, clientCap: 60, userCap: 20, firmsOnPlan: 1 },
  { id: "bp-4", name: "Enterprise", priceMonthly: 1899, clientCap: 999, userCap: 999, firmsOnPlan: 1 },
];

export const INVOICES: InvoiceRecord[] = [
  { id: "in-1", firmName: "Whitfield & Co Accountants", amount: 249, status: "paid", issuedAt: "1 Aug 2026" },
  { id: "in-2", firmName: "Aldergate Practice LLP", amount: 899, status: "paid", issuedAt: "1 Aug 2026" },
  { id: "in-3", firmName: "Fenwick Accounting Services", amount: 49, status: "failed", issuedAt: "1 Aug 2026" },
  { id: "in-4", firmName: "Clearwater Chartered", amount: 1899, status: "paid", issuedAt: "1 Aug 2026" },
  { id: "in-5", firmName: "Priory Tax & Advisory", amount: 249, status: "pending", issuedAt: "1 Aug 2026" },
  { id: "in-6", firmName: "Marsh & Delaney", amount: 49, status: "refunded", issuedAt: "3 Mar 2025" },
];

export const REVENUE_SERIES: RevenuePoint[] = [
  { month: "Mar", mrr: 2840, newFirms: 2, churnedFirms: 0 },
  { month: "Apr", mrr: 3120, newFirms: 3, churnedFirms: 1 },
  { month: "May", mrr: 3390, newFirms: 2, churnedFirms: 0 },
  { month: "Jun", mrr: 3640, newFirms: 1, churnedFirms: 1 },
  { month: "Jul", mrr: 3980, newFirms: 3, churnedFirms: 0 },
  { month: "Aug", mrr: 4345, newFirms: 2, churnedFirms: 1 },
];

export const FUNNEL: FunnelStageRecord[] = [
  { stage: "Signed up", count: 218 },
  { stage: "Completed onboarding", count: 164 },
  { stage: "Uploaded first document", count: 139 },
  { stage: "Converted to paid", count: 47 },
];

export const TICKETS: TicketRecord[] = [
  { id: "tk-1", firmName: "Aldergate Practice LLP", subject: "OCR keeps misreading VAT number on handwritten receipts", priority: "high", plan: "Practice", status: "open", updatedAt: "22 min ago" },
  { id: "tk-2", firmName: "Northgate Bookkeeping", subject: "Can't connect Starling bank feed", priority: "normal", plan: "Starter", status: "pending", updatedAt: "3 hours ago" },
  { id: "tk-3", firmName: "Clearwater Chartered", subject: "Bulk export timing out for 200+ documents", priority: "urgent", plan: "Enterprise", status: "open", updatedAt: "47 min ago" },
  { id: "tk-4", firmName: "Fenwick Accounting Services", subject: "Card payment declined — need to update billing details", priority: "high", plan: "Starter", status: "open", updatedAt: "5 hours ago" },
  { id: "tk-5", firmName: "Whitfield & Co Accountants", subject: "Feature request: bulk category reassignment", priority: "low", plan: "Growth", status: "resolved", updatedAt: "2 days ago" },
];

export const TAX_RULES: TaxRuleRecord[] = [
  { id: "tr-1", name: "VAT registration threshold", value: "£90,000", effectiveFrom: "1 Apr 2024", version: 3 },
  { id: "tr-2", name: "Standard VAT rate", value: "20%", effectiveFrom: "4 Jan 2011", version: 1 },
  { id: "tr-3", name: "Reduced VAT rate", value: "5%", effectiveFrom: "1 Sep 1997", version: 1 },
  { id: "tr-4", name: "Flat Rate Scheme — catering", value: "12.5%", effectiveFrom: "1 Apr 2017", version: 2 },
  { id: "tr-5", name: "Annual Investment Allowance cap", value: "£1,000,000", effectiveFrom: "1 Jan 2019", version: 4 },
];

export const AUDIT_LOG: AuditLogEntry[] = [
  { id: "al-1", actor: "support@accorix.io", action: "Started impersonation session", target: "Northgate Bookkeeping", timestamp: "12 Aug, 14:02", flagged: false },
  { id: "al-2", actor: "support@accorix.io", action: "Ended impersonation session", target: "Northgate Bookkeeping", timestamp: "12 Aug, 14:11", flagged: false },
  { id: "al-3", actor: "billing@accorix.io", action: "Issued refund (£49.00)", target: "Marsh & Delaney", timestamp: "11 Aug, 09:40", flagged: false },
  { id: "al-4", actor: "r.marsh@aldergatepractice.co.uk", action: "Exported 340 client records", target: "Aldergate Practice LLP", timestamp: "10 Aug, 22:17", flagged: true },
  { id: "al-5", actor: "admin@accorix.io", action: "Changed plan Starter → Growth", target: "Priory Tax & Advisory", timestamp: "9 Aug, 11:05", flagged: false },
  { id: "al-6", actor: "admin@accorix.io", action: "Suspended firm", target: "Priory Tax & Advisory", timestamp: "9 Aug, 11:06", flagged: false },
];

export const INTERNAL_ROLES: InternalRoleRecord[] = [
  { id: "ir-1", name: "Super Admin", description: "Full access to every section; manages other internal roles and critical settings.", memberCount: 2, permissions: ["All sections", "Manage roles", "Billing overrides"] },
  { id: "ir-2", name: "Product/AI Admin", description: "AI models, prompts, categorisation rules, tax rules engine.", memberCount: 3, permissions: ["AI Ops", "Category management", "System settings (rules)"] },
  { id: "ir-3", name: "Billing/Finance Admin", description: "Plans, invoices, discounts, financial reports.", memberCount: 2, permissions: ["Billing & subscriptions", "Business reports"] },
  { id: "ir-4", name: "Support Agent", description: "Firm accounts via controlled impersonation, support tickets.", memberCount: 5, permissions: ["Helpdesk", "Firms (impersonate, read-only)"] },
  { id: "ir-5", name: "Growth/Sales Admin", description: "Trials, leads, discount codes, trial extensions.", memberCount: 2, permissions: ["Billing (discounts)", "Firms (trial extend)"] },
];

export function clientById(id: string) {
  return CLIENTS.find((c) => c.id === id);
}

export function projectsForClient(clientId: string) {
  return PROJECTS.filter((p) => p.clientId === clientId);
}

export function projectById(id: string) {
  return PROJECTS.find((p) => p.id === id);
}

export function firmById(id: string) {
  return ADMIN_FIRMS.find((f) => f.id === id);
}
