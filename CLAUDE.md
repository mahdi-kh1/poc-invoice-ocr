# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Next.js 14 (App Router, TypeScript) proof-of-concept that measures the feasibility of a
two-stage invoice/receipt pipeline: OCR text extraction via Tesseract.js (local, free, no signup)
with structured-field extraction and expense classification both handled by an OpenRouter LLM.
Extraction covers standard invoice fields, UK retail-receipt fields (VAT number, payment method,
merchant address, subtotal, receipt time), and bank-statement-line fields — whichever don't apply
to a given document come back `null`. It is explicitly **not production code** — no auth, no rate
limiting, no hardened file validation. See [README.md](README.md) for setup/usage notes.

## Commands

```bash
npm install
cp .env.example .env.local   # then fill in OPENROUTER_API_KEY
npm run dev                  # http://localhost:3000 (add `-- -p 8080` to change port)
npm run build                # must pass with zero TS/ESLint errors before calling anything done
npm run start                # serve the production build
npm run lint
```

There is no test suite in this repo — validation is `npm run build` (type-checks + lints) plus
manually exercising `/api/ocr` and `/api/classify` with curl or the browser.

Next.js only reads `.env.local` at server start — restart `npm run dev` after editing it.

## Architecture

Two independent, user-triggered pipeline stages (deliberately decoupled so OCR accuracy and
classification accuracy can be evaluated separately):

```
app/page.tsx ("use client")
  ├─ upload (multiple files) → in-memory row state per file:
  │  pending → ocr_running → ocr_done → classify_running → classify_done
  │                       └→ ocr_error            └→ classify_error
  ├─ "Step 1" button → POST /api/ocr per pending row (one at a time, sequential)
  ├─ "Step 2" button → POST /api/classify per ocr_done row (sends current category list)
  ├─ "View" per row → native <dialog> with full field list + image preview (object URL from the row's File)
  ├─ "Categories" button → native <dialog> to add/remove categories (persisted to localStorage)
  ├─ "Help" button → native <dialog> describing the end-to-end flow
  └─ CSV export — pure client-side (Blob + URL.createObjectURL, UTF-8 BOM)
```

- **`app/api/ocr/route.ts`**: accepts `multipart/form-data` (field `file`, image only — PDFs are
  rejected with a friendly error since Tesseract.js does not support PDF directly). Runs the image
  through a Tesseract.js worker (`createWorker(["eng"], ...)`, trained-data cached under
  `.tesseract-cache/`, gitignored) to get raw OCR text, then sends that text to the same
  OpenRouter chat model used for classification with a field-extraction prompt to pull out
  invoice fields (`vendorName`, `invoiceNumber`, `invoiceDate`, `totalAmount`, `currency`,
  `vatAmount`), UK-receipt fields (`vatNumber`, `merchantAddress`, `paymentMethod`, `subtotal`,
  `receiptTime`), and bank-statement fields (`transactionType`, `description`, `debitAmount`,
  `creditAmount`, `balance`, `accountName`, `accountNumber`, `sortCode`) as JSON — whichever don't
  apply to the scanned document come back `null` (```json fences stripped before `JSON.parse`,
  same pattern as `/api/classify`).
- **`app/api/classify/route.ts`**: takes the OCR output plus a `categories: string[]` array as
  JSON, prompts an OpenRouter chat model (`OPENROUTER_MODEL`, default `openai/gpt-oss-20b:free` —
  check https://openrouter.ai/models?max_price=0 before relying on any `:free` model still being
  free) to return raw JSON (```json fences stripped before `JSON.parse`) constrained to one of the
  given categories. Falls back to `DEFAULT_CATEGORIES` (`lib/categories.ts`) if `categories` is
  omitted or empty — that list is no longer hardcoded in this route.
- **`lib/types.ts`**: the only cross-cutting module — `RowStatus`, `OcrExtractedData`,
  `ClassifyResult` are shared between both API routes and `app/page.tsx`. Change a field shape
  here first if extending the pipeline.
- **`lib/categories.ts`**: `DEFAULT_CATEGORIES` (seed list) and `CATEGORIES_STORAGE_KEY` (the
  `localStorage` key the client persists its editable category list under) — shared between
  `app/page.tsx` and `/api/classify`.

## Conventions specific to this repo

- **Every user-facing error must be a friendly, plain-English string returned as JSON**
  (`{ error: "..." }` with a non-2xx status), never a raw thrown error or an empty 500 — this
  includes missing env vars, OpenRouter failures, and malformed request bodies. Both routes wrap
  their entire body in try/catch for this reason; keep that pattern for any new route.
- UI is English/LTR end-to-end: `app/layout.tsx` sets `lang="en" dir="ltr"` on `<html>`, and all
  user-visible strings (status labels, table headers, button text) are English.
- Import alias `@/*` maps to the repo root (`tsconfig.json`), e.g. `@/lib/types`.
- Next.js is pinned to the 14.x line on purpose (matches the original spec); `npm audit` will
  show unresolved "high" advisories that only have fixes in Next 16 — see the note near the end
  of README.md before ever changing that.
