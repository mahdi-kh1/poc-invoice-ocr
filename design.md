# Design — Invoice OCR + Classification POC

Technical design reference for this repo. For setup/usage in Persian see [README.md](README.md);
for Claude Code working conventions see [CLAUDE.md](CLAUDE.md).

## Goal

Measure feasibility (not build a product) of two independently-swappable services:

1. Can Azure Document Intelligence's `prebuilt-invoice` model extract structured fields from
   real invoices accurately enough?
2. Can a free OpenRouter LLM classify the resulting expense into a fixed category list
   accurately enough?

The two stages are kept decoupled in the UI (separate buttons, separate row states) specifically
so accuracy of each can be measured independently — a bad classification shouldn't be blamed on
OCR and vice versa.

## System diagram

```
┌─────────────┐   multipart/form-data    ┌──────────────────┐
│  page.tsx   │ ───────────────────────► │  /api/ocr         │──┐
│ (client)    │                          │  (route.ts)       │  │ POST analyze (202)
│             │ ◄─── {vendorName, ... } ─│                    │  ▼
│  row state  │                          └──────────────────┘  Azure Document Intelligence
│  per file   │                                   │             prebuilt-invoice model
│             │                                   └── poll operation-location
│             │                                       every 1.5s, ≤20 attempts
│             │        JSON                    ┌──────────────────┐
│             │ ───────────────────────────────►│  /api/classify    │──┐
│             │ ◄─── {category, confidence} ────│  (route.ts)        │  │ chat/completions
└─────────────┘                                 └──────────────────┘  ▼
       │                                                          OpenRouter
       └── Export CSV (client-only: Blob + URL.createObjectURL)
```

## Row state machine (`app/page.tsx`)

```
pending ──runOCR()──► ocr_running ──success──► ocr_done ──runClassify()──► classify_running ──success──► classify_done
                            │                                                      │
                            └──failure──► ocr_error                                └──failure──► classify_error
```

- `runOCR()` only processes rows currently in `pending`; `runClassify()` only processes rows in
  `ocr_done`. Both iterate sequentially (`for...of` with `await`), not in parallel — deliberate,
  to stay under free-tier rate limits and keep polling logs readable.
- There is no retry affordance in the UI today; a failed row stays in `*_error` until the file is
  re-added. (Worth revisiting if this POC graduates past feasibility testing.)
- All row state lives in React state in `page.tsx` — nothing is persisted. A page refresh loses
  all results; Export CSV before reloading.

## API contracts

### `POST /api/ocr`

Request: `multipart/form-data`, single field `file` (image or PDF).

Success (`200`):
```json
{
  "success": true,
  "data": {
    "vendorName": "string | null",
    "invoiceNumber": "string | null",
    "invoiceDate": "string | null",
    "totalAmount": "number | null",
    "currency": "string | null",
    "vatAmount": "number | null",
    "rawText": "string (first 2000 chars of analyzeResult.content)"
  }
}
```

Failure (`400`/`500`/`504`): `{ "error": "<Persian message>" }`. Known cases: no file, malformed
request body (not multipart), missing `AZURE_DI_ENDPOINT`/`AZURE_DI_KEY`, Azure returning a
non-202 on the initial analyze call, missing `operation-location` header, Azure status
`"failed"`, or polling exhausting all 20 attempts (~30s) without reaching `"succeeded"`.

Implementation notes:
- Azure's analyze call is fire-and-poll: initial `POST .../prebuilt-invoice:analyze` returns
  `202` with an `operation-location` header (no body); the route then polls that URL with the
  same subscription key until `status` flips to `succeeded` or `failed`.
- Field unwrapping helpers (`fieldValue`, `fieldCurrencyAmount`, `fieldCurrencyCode`) exist
  because Azure's field shape varies by type (`valueString`, `valueNumber`, `valueDate`,
  `valueCurrency.{amount,currencyCode}`, or fallback `content`) — extend these, not ad-hoc
  inline access, if new fields are pulled from `fields`.

### `POST /api/classify`

Request: `application/json`
```json
{ "vendorName": "string?", "totalAmount": "number?", "currency": "string?", "invoiceNumber": "string?", "rawText": "string?" }
```

Success (`200`):
```json
{ "success": true, "data": { "category": "<one of CATEGORIES>", "confidence": 0 } }
```

Failure (`500`): `{ "error": "<Persian message>" }`. Known cases: missing `OPENROUTER_API_KEY`,
non-OK response from OpenRouter (message includes a hint to check
`OPENROUTER_MODEL` against https://openrouter.ai/models?max_price=0), or the model's response not
being parseable JSON after stripping ` ```json ` fences (raw content is included in the error
body for debugging).

Fixed category list (`CATEGORIES` in `app/api/classify/route.ts`): Office Supplies, Travel,
Meals & Entertainment, Equipment, Repairs & Maintenance, Software & Subscriptions, Utilities,
Professional Services, Marketing, Rent, Other. The prompt instructs the model to pick exactly one
and return raw JSON only — there is no server-side validation that the returned `category` is
actually in this list, so a misbehaving model could return an out-of-list value un-caught.

## Error-handling policy

Every route wraps its entire body in try/catch and always resolves to a JSON body with an
`error` string in Persian on failure — the point is that the frontend, and a human eyeballing
network traffic, never sees a bare Next.js crash page or an English stack trace. When adding new
failure paths, match this: catch close to the operation that can fail, translate to a specific
Persian message, don't let anything bubble to an unguarded top-level throw.

## Configuration

| Var | Consumed by | Notes |
|---|---|---|
| `AZURE_DI_ENDPOINT` | `/api/ocr` | trailing slash stripped before building the analyze URL |
| `AZURE_DI_KEY` | `/api/ocr` | sent as `Ocp-Apim-Subscription-Key` |
| `OPENROUTER_API_KEY` | `/api/classify` | sent as `Authorization: Bearer` |
| `OPENROUTER_MODEL` | `/api/classify` | defaults to `qwen/qwen-2.5-7b-instruct:free` if unset |

Both routes treat a missing key as a normal, expected failure mode (POC users often won't have
keys configured yet) — not an exceptional crash.

## Known limitations / explicitly out of scope

- No auth, no rate limiting, no per-file size/type validation beyond the browser's `accept`
  attribute.
- No persistence layer — results exist only in browser memory for the session.
- Sequential (not parallel/batched) processing of rows; fine for POC-scale test batches, would
  need reworking for volume.
- Next.js is pinned to 14.x; several `npm audit` "high" advisories only have fixes in Next 16
  (SSRF/cache-poisoning classes relevant to self-hosted production deployments) — acceptable
  because this only ever runs on `localhost`. Revisit before any non-local deployment.
