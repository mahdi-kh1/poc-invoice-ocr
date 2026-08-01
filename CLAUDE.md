# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Next.js 14 (App Router, TypeScript) proof-of-concept that measures the feasibility of a
two-stage invoice pipeline: OCR extraction via Azure Document Intelligence, then expense
classification via an OpenRouter LLM. It is explicitly **not production code** — no auth, no
rate limiting, no hardened file validation. See [README.md](README.md) for the full Persian
writeup of architecture, env vars, and free-tier limits.

## Commands

```bash
npm install
cp .env.example .env.local   # then fill in AZURE_DI_ENDPOINT / AZURE_DI_KEY / OPENROUTER_API_KEY
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
  ├─ "مرحله ۱" button → POST /api/ocr per pending row (one at a time, sequential)
  ├─ "مرحله ۲" button → POST /api/classify per ocr_done row
  └─ CSV export — pure client-side (Blob + URL.createObjectURL, UTF-8 BOM for Excel/Farsi)
```

- **`app/api/ocr/route.ts`**: accepts `multipart/form-data` (field `file`), forwards the raw
  bytes to Azure Document Intelligence's `prebuilt-invoice` model. Azure's analyze endpoint is
  async: the route POSTs to `...:analyze`, reads the `operation-location` response header, then
  polls that URL every 1.5s (up to 20 attempts) until `status === "succeeded"`. Field extraction
  (`vendorName`, `invoiceNumber`, `totalAmount`, currency, VAT, etc.) is unwrapped from Azure's
  nested `analyzeResult.documents[0].fields` shape by the local `fieldValue` /
  `fieldCurrencyAmount` / `fieldCurrencyCode` helpers.
- **`app/api/classify/route.ts`**: takes the OCR output as JSON, prompts an OpenRouter chat model
  (`OPENROUTER_MODEL`, default `qwen/qwen-2.5-7b-instruct:free` — check
  https://openrouter.ai/models?max_price=0 before relying on any `:free` model still being free)
  to return raw JSON (```json fences stripped before `JSON.parse`) constrained to one of the
  eleven hardcoded `CATEGORIES`.
- **`lib/types.ts`**: the only cross-cutting module — `RowStatus`, `OcrExtractedData`,
  `ClassifyResult` are shared between both API routes and `app/page.tsx`. Change a field shape
  here first if extending the pipeline.

## Conventions specific to this repo

- **Every user-facing error must be a friendly Persian string returned as JSON** (`{ error: "..." }`
  with a non-2xx status), never a raw thrown error or an empty 500 — this includes missing env
  vars, Azure/OpenRouter failures, and malformed request bodies. Both routes wrap their entire
  body in try/catch for this reason; keep that pattern for any new route.
- UI is RTL end-to-end: `app/layout.tsx` sets `lang="fa" dir="rtl"` on `<html>`, and all
  user-visible strings (status labels, table headers, button text) are Persian.
- Import alias `@/*` maps to the repo root (`tsconfig.json`), e.g. `@/lib/types`.
- Next.js is pinned to the 14.x line on purpose (matches the original spec); `npm audit` will
  show unresolved "high" advisories that only have fixes in Next 16 — see the note near the end
  of README.md before ever changing that.
