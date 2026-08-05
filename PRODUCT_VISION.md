# Accorix — Full Product Vision

This file is the **content source** for the `/vision` landing page (see the "Planned feature —
Demo/marketing layer" section in `CLAUDE.md`). It is not technical documentation of this repo —
this repo is a small feasibility POC (OCR + classification only); this file describes the
**full-scale SaaS product** that POC is a preview slice of, for a UK-based client. Keep this file
and the landing page in sync: if the roadmap/feature list here changes, update the page copy to
match, and vice versa — don't let them drift.

Tone for the landing page copy pulled from this file: confident, plain-English, benefit-first
(what the user can *do*), not a spec dump. Section headings below map roughly 1:1 to landing page
sections; sub-bullets are the kind of detail that becomes feature-card copy, not necessarily
verbatim page text.

---

## 1. Hero

**Product name:** Accorix
**Tagline:** The Smarter Accounting Assistant
**One-line positioning:** A cloud accounting platform built for firms who manage many clients at
once — not a bolt-on OCR tool, a full replacement for Xero/QuickBooks with AI woven in from the
first uploaded receipt through to the filed VAT return.

**Hero subhead (context for this demo specifically):** *What you're using right now is a
feasibility slice of Accorix — the document-extraction-and-categorisation engine at the heart of
Phase 1. This page shows where it's headed.*

Primary CTA: "See the full roadmap" (scrolls down)
Secondary CTA: "← Back to the live demo" (returns to `/`)

---

## 2. The problem

Accounting firms serving many clients today stitch together separate tools for bookkeeping
(Xero/QuickBooks), document capture (Dext or manual entry), spreadsheets for anything the
software doesn't model well, and yet another tool or a spreadsheet for VAT deadline tracking.
Each client is a separate mental context switch, and none of these tools were built
firm-first — they were built for a single business, then retrofitted with a "practice" layer.

## 3. The vision (North Star)

A firm should be able to go from *"here's a photo of a receipt"* to *"VAT return filed with
HMRC"* without ever leaving Accorix. One login. One place clients live. AI does the
repetitive extraction and first-pass categorisation; the accountant stays the one who signs off
on anything that matters.

> **Human-in-the-loop, always.** Accorix never files, never finalises a professional judgement
> call (capital vs. revenue, scheme eligibility, etc.) without an accountant's explicit
> approval. AI drafts; humans decide. This isn't a phase-3 feature — it's a constraint that
> applies from day one and never gets relaxed for convenience.

---

## 4. Who it's for

- **Primary customer:** accounting firms and bookkeeping practices in the UK managing multiple
  clients (the B2B side of a B2B2C model).
- **End beneficiary:** each firm's own clients — small and medium UK businesses — whose books get
  done faster and with fewer manual errors, and who (from Phase 2 onward) get a lightweight portal
  of their own to drop documents into.

---

## 5. Roadmap — three phases

| Phase | Name | What ships |
|---|---|---|
| **1 — Now** | Extract & Categorise | OCR from PDF/photo (printed, scanned, handwritten), hybrid AI categorisation (fixed rules + per-firm learning), multi-client practice structure, dashboards & exports |
| **2 — Next** | Connect | Automatic sync of cleaned data into third-party tax/accounting software; a lightweight client portal so a firm's own customers can upload documents directly |
| **3 — Later** | File | Direct VAT (and eventually other) submissions to HMRC via Making Tax Digital, filed from inside Accorix — no extra software required |

This POC you're testing lives entirely inside Phase 1: OCR (Tesseract.js + LLM field extraction)
and categorisation (currently an editable flat category list; the full product adds per-firm
learned rules on top of it).

---

## 6. What a firm can do (customer-facing product)

- **Onboard in minutes:** sign up as a firm, invite the team, add the first client.
- **Manage many clients from one place:** each client gets its own profile (VAT number, company
  registration, financial year end, VAT scheme, connected bank accounts) and its own team
  assignment — no client sees another client's data, ever.
- **Define projects per client:** a VAT quarter, a year-end account, a month of bookkeeping —
  each with a due date, a checklist, and a status that moves through the pipeline.
- **Upload documents any way that's convenient:** drag-and-drop, a per-client forwarding email
  address, or a phone photo. Handwritten and low-quality scans are a first-class case, not an
  edge case — real client documents are messy, and the pipeline is built around that reality.
- **Trust but verify:** every extracted field carries a confidence score; low-confidence fields
  are queued for a quick human check instead of silently accepted.
- **Categorise faster over time:** the hybrid engine starts from solid general rules for a brand
  new firm (no cold-start cliff) and gets sharper the more a firm corrects it — corrections are
  never thrown away.
- **Reconcile automatically:** connected bank feeds are matched against uploaded documents;
  what's left over is what actually needs a human look.
- **Get proactive tax guidance, not surprises:** VAT-threshold monitoring, scheme-eligibility
  checks, deadline reminders, and relevant tax-saving suggestions — all clearly labelled as
  suggestions an accountant reviews, never as decisions already made.
- **Ask an AI assistant that actually knows the account:** chat scoped to a firm, a client, or a
  single project, with answers that cite the underlying transaction or document — not a
  generic chatbot bolted on the side.
- **Report and export:** P&L, balance sheet, cash flow, VAT drafts, aged debtors/creditors — as
  Excel, PDF, or CSV, or scheduled straight to an inbox.

## 7. What we run behind the scenes (internal admin panel)

The same platform that firms use is managed, for Accorix itself, through an internal panel that
covers: firm accounts and their usage/billing status, global and industry-specific category
templates, AI model/prompt versioning with per-firm cost and accuracy monitoring, subscription
plans and invoicing, support tooling tied directly to a firm's live data for fast diagnosis, and
a full audit trail of every admin action (especially anything touching a firm's data, like
support impersonation).

## 8. The pipeline, visually

```
Upload (PDF / photo / handwriting)
   ↓
OCR extraction — confidence score per field
   ↓
Hybrid categorisation — rules + per-firm learning
   ↓
Human review (only what needs it)
   ↓
Bank reconciliation
   ↓
Reports & exports
   ↓  (Phase 2)
Sync to tax/accounting software
   ↓  (Phase 3)
Filed with HMRC
```

This is the shape the landing page's animated pipeline section should follow — one step reveals
into the next on scroll, not all seven at once.

## 9. Why not just use Xero/QuickBooks + Dext?

Because those are two products bolted together, built for a single business first and a practice
second. Accorix is practice-first from the ground up: multi-client structure isn't an add-on, and
the AI categorisation engine is the *entry point* to the product, not a plugin on top of an
existing ledger. The honest trade-off: Xero/QuickBooks are mature and battle-tested today;
Accorix's bet is being faster, more AI-native, and UK-practice-specific enough to be worth the
switch as it matures through these three phases.

## 10. Status of what you're looking at right now

Be explicit and honest on the landing page about this: **this is a feasibility demo**, not the
finished product. It proves out the hardest technical bet in Phase 1 (can free/local OCR plus an
LLM reliably turn a messy real-world document into structured, categorised data) before the full
multi-tenant platform gets built around it. No auth, no persistence, no billing — see this repo's
own `design.md` "Known limitations" section for the specific list.
