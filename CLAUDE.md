# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Next.js 14 (App Router, TypeScript) proof-of-concept that measures the feasibility of a
two-stage invoice/receipt pipeline: OCR text extraction via Tesseract.js (local, free, no signup),
run over uploaded images or PDFs (each PDF page rasterized and OCR'd separately), with
structured-field extraction and expense classification both handled by an OpenRouter LLM. A single
page/photo can contain more than one receipt — extraction returns an array so those are split into
separate results rather than merged. Extraction covers standard invoice fields, UK retail-receipt
fields (VAT number, payment method, merchant address, subtotal, receipt time), and
bank-statement-line fields — whichever don't apply to a given document come back `null`. It is
explicitly **not production code** — no auth, no rate limiting, no hardened file validation. See
[README.md](README.md) for setup/usage notes.

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
  ├─ upload (multiple files, image or PDF) → in-memory row state per file:
  │  pending → ocr_running → ocr_done → classify_running → classify_done
  │                       └→ ocr_error            └→ classify_error
  ├─ "Step 1: Extract (OCR)" button → POST /api/ocr per pending row (one at a time, sequential);
  │  a row whose response array has >1 entry (multi-page PDF, or multiple receipts detected on one
  │  page/image) is fanned out into multiple rows (`expandRow`) tagged with a `sourceLabel`
  ├─ "Step 2: Classify" button → POST /api/classify per ocr_done row (sends current category list)
  ├─ "View" per row → native <dialog> with full field list (editable once OCR has run — lets the
  │  user fill in anything OCR missed before classifying) + image/PDF preview (object URL from the
  │  row's File; PDFs render via <iframe> jumped to the row's `pageNumber` fragment)
  ├─ "Show Error" per row (rendered only when `error` is set) → opens the same detail dialog with
  │  the full error message in a banner, instead of truncating it in the table cell
  ├─ "Categories" button → native <dialog> to add/remove categories (persisted to localStorage)
  ├─ "Help" button → native <dialog> describing the end-to-end flow
  └─ CSV export — pure client-side (Blob + URL.createObjectURL, UTF-8 BOM)
```

- **`app/api/ocr/route.ts`**: accepts `multipart/form-data` (field `file`, image **or PDF**). A PDF
  is rasterized page-by-page with `pdfjs-dist` + `@napi-rs/canvas` (capped at `MAX_PDF_PAGES`
  pages, currently 15) since Tesseract.js can't read PDF directly; a plain image is treated as one
  page. Every page/image is downscaled to `MAX_OCR_DIMENSION` (2000px longest side) before OCR —
  full-resolution photos/screenshots make Tesseract dramatically slower without more accuracy, and
  this also keeps requests inside Vercel's function timeout. Each page is then run through a
  Tesseract.js worker (`createWorker(["eng"], ...)`, trained-data cached under
  `os.tmpdir()/poc-invoice-ocr-tesseract-cache` — **not** under the repo/`cwd()`, since serverless
  hosts like Vercel ship a read-only deployment bundle and only `/tmp` is writable there — and
  loaded via an explicit `langPath` pointing at the `@tesseract.js-data/eng` package already in
  `node_modules`, so the trained-data file is read from the bundle instead of fetched from
  jsDelivr's CDN on every cold start) to get raw OCR text, then that text is sent to the same
  OpenRouter chat model used for classification with a field-extraction prompt asking for a JSON
  **array** of receipts — a single page/photo commonly contains more than one receipt, so the
  model is asked to split them instead of merging their fields. That OpenRouter call is wrapped in
  an `AbortController` timeout (`OPENROUTER_TIMEOUT_MS`) — the free model's response time is
  highly variable in practice (single-digit seconds to 40+ seconds for the same prompt), and
  without this Vercel's own `maxDuration` kill produces a bare HTML 504 instead of our JSON error
  format; aborting first turns a slow model into a normal, friendly error. Each array entry
  carries invoice fields (`vendorName`, `invoiceNumber`, `invoiceDate`, `totalAmount`, `currency`,
  `vatAmount`), UK-receipt fields (`vatNumber`, `merchantAddress`, `paymentMethod`, `subtotal`,
  `receiptTime`), and bank-statement fields (`transactionType`, `description`, `debitAmount`,
  `creditAmount`, `balance`, `accountName`, `accountNumber`, `sortCode`) — whichever don't apply to
  the scanned document come back `null` (```json fences stripped before `JSON.parse`, same pattern as
  `/api/classify`). The route always responds `{ success: true, data: OcrExtractedData[] }`, one
  entry per detected receipt, each tagged with `pageNumber` (1-based for a PDF page, `null` for a
  plain image).
- **`app/api/classify/route.ts`**: takes the OCR output plus a `categories: string[]` array as
  JSON, prompts an OpenRouter chat model (`OPENROUTER_MODEL`, default `openai/gpt-oss-20b:free` —
  check https://openrouter.ai/models?max_price=0 before relying on any `:free` model still being
  free) — same `AbortController`/`OPENROUTER_TIMEOUT_MS` pattern as `/api/ocr` — to return raw
  JSON (```json fences stripped before `JSON.parse`) constrained to one of the
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
- `pdfjs-dist` and `@napi-rs/canvas` must stay listed in `next.config.js`'s
  `experimental.serverComponentsExternalPackages` (alongside `tesseract.js`) — both do dynamic
  `require`/`import()` internally that webpack's bundler cannot resolve, producing a "Cannot find
  module" error at runtime (not build time) if bundled. Any dynamic `import()` of a pdfjs-dist
  subpath in route code must also use a literal string specifier, not a computed path — a computed
  specifier defeats the externalization and hits the same failure.
- **This app is deployed on Vercel** (serverless Node functions) as well as run locally — any
  filesystem write must target `os.tmpdir()`, never `process.cwd()` or a repo-relative path
  (Vercel's deployment bundle is read-only; only `/tmp` is writable, and it's wiped between
  invocations). A write to the wrong place throws at *module import time* if it's a top-level side
  effect, which crashes the whole function before any try/catch runs and surfaces to the client as
  an HTML error page instead of the route's usual JSON error — this exact bug is why
  `TESSERACT_CACHE_PATH` in `/api/ocr` uses `os.tmpdir()`. Both routes also set
  `export const maxDuration` since OCR + PDF rasterization + the OpenRouter round-trip can exceed
  Vercel's default 10s function timeout, especially on a cold start.
- Import alias `@/*` maps to the repo root (`tsconfig.json`), e.g. `@/lib/types`.
- Next.js is pinned to the 14.x line on purpose (matches the original spec); `npm audit` will
  show unresolved "high" advisories that only have fixes in Next 16 — see the note near the end
  of README.md before ever changing that.
