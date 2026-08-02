# Design — Invoice OCR + Classification POC

Technical design reference for this repo. For setup/usage see [README.md](README.md); for Claude
Code working conventions see [CLAUDE.md](CLAUDE.md).

## Goal

Measure feasibility (not build a product) of two independently-swappable services:

1. Can Tesseract.js (local, free, no signup) extract usable raw text from real invoice images,
   and can a free OpenRouter LLM turn that raw text into structured fields accurately enough?
2. Can the same free OpenRouter LLM classify the resulting expense into a fixed category list
   accurately enough?

The two stages are kept decoupled in the UI (separate buttons, separate row states) specifically
so accuracy of each can be measured independently — a bad classification shouldn't be blamed on
OCR and vice versa.

## System diagram

```
┌─────────────┐   multipart/form-data    ┌──────────────────┐
│  page.tsx   │ ───────────────────────► │  /api/ocr         │──┐
│ (client)    │                          │  (route.ts)       │  │ image buffer
│             │ ◄─── {vendorName, ... } ─│                    │  ▼
│  row state  │                          │                    │  Tesseract.js worker
│  per file   │                          │                    │  (local, eng) → raw text
│             │                          │                    │──┐
│             │                          └──────────────────┘  │ field-extraction prompt
│             │        JSON                    ┌──────────────────┐
│             │ ───────────────────────────────►│  /api/classify    │──┐
│             │ ◄─── {category, confidence} ────│  (route.ts)        │  │ chat/completions
└─────────────┘                                 └──────────────────┘  ▼
       │                                                          OpenRouter (used by both routes)
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
  all results; Export CSV before reloading. (The category list is the one exception — see below.)

## Row detail modal, categories panel & help dialog (`app/page.tsx`)

- Clicking "View" on a row opens a native `<dialog>` (`detailDialogRef`, `showModal()`/`close()`
  driven by `selectedRowId` state) showing every extracted field (`DETAIL_FIELDS`) plus an image
  preview built from the row's original `File` via `URL.createObjectURL` (revoked on close/row
  change). Native `<dialog>` was chosen over a hand-rolled overlay because it gets focus trapping,
  Escape-to-close, and focus restoration to the trigger element for free per the HTML spec —
  backdrop-click-to-close is the one bit added manually (checking `e.target === dialogRef.current`
  in the dialog's own `onClick`).
- The "Categories (N)" toolbar button opens a second `<dialog>` for managing the classification
  category list: add/remove chips, reset to defaults. This list is **not** the same as invoice row
  state — it's stored in `localStorage` under `CATEGORIES_STORAGE_KEY` (`lib/categories.ts`) so it
  survives page reloads, and it's sent as `categories` on every `/api/classify` call (see below).
  Categories are loaded from `localStorage` in a `useEffect` (not the initial `useState`) to avoid
  a server/client hydration mismatch, since `localStorage` isn't available during SSR.
- The "Help" toolbar button opens a third `<dialog>` with a static numbered walkthrough of the
  upload → OCR → view → classify → categories → export flow — pure copy, no state, same
  `showModal()`/`close()` pattern as the other two dialogs.

## API contracts

### `POST /api/ocr`

Request: `multipart/form-data`, single field `file` (image only — PDF is rejected with a
friendly error, see below).

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
    "transactionType": "string | null",
    "description": "string | null",
    "debitAmount": "number | null",
    "creditAmount": "number | null",
    "balance": "number | null",
    "accountName": "string | null",
    "accountNumber": "string | null",
    "sortCode": "string | null",
    "vatNumber": "string | null",
    "merchantAddress": "string | null",
    "paymentMethod": "string | null",
    "subtotal": "number | null",
    "receiptTime": "string | null",
    "rawText": "string (first 2000 chars of the Tesseract.js OCR output)"
  }
}
```

`transactionType`/`description`/`debitAmount`/`creditAmount`/`balance`/`accountName`/`accountNumber`/
`sortCode` are bank-statement-style fields; `vatNumber`/`merchantAddress`/`paymentMethod`/`subtotal`/
`receiptTime` are UK-retail-receipt fields. Both groups are added alongside the original invoice
fields so the same pipeline covers invoice photos, UK receipts, and bank-statement line images —
whichever fields don't apply to the scanned document come back `null` rather than being guessed.

Failure (`400`/`500`): `{ "error": "<message>" }`. Known cases: no file, malformed
request body (not multipart), a PDF upload (Tesseract.js doesn't support PDF — the client-side
`accept` still allows `.pdf` for now, but the route rejects it),
missing `OPENROUTER_API_KEY` (required — it powers field extraction, not just classification),
Tesseract producing empty text (blurry/corrupt image), or the field-extraction LLM call failing /
returning unparseable JSON.

Implementation notes:
- OCR is fully local: a Tesseract.js worker is created per request with `langs: ["eng"]`,
  trained-data cached under `.tesseract-cache/` (gitignored) via the `cachePath` option, and
  terminated after `recognize()` returns — no external OCR service, no signup, no card required.
- Tesseract only returns raw text, no structured fields — there's no field-unwrapping helper.
  Instead, the raw text is sent to the OpenRouter chat model (`extractFields` in `route.ts`) with a
  prompt asking for `vendorName`/`invoiceNumber`/etc. as raw JSON, parsed the same way
  `/api/classify` parses its response (strip ```json fences, then `JSON.parse`).
  `toStringOrNull`/`toNumberOrNull` coerce the LLM's (untrusted) field types before they're
  returned to the client.
- Because field extraction now goes through an LLM instead of a purpose-built invoice model,
  accuracy depends more on OCR text quality and prompt wording than before — worth watching when
  evaluating this stage's feasibility.

### `POST /api/classify`

Request: `application/json`
```json
{ "vendorName": "string?", "totalAmount": "number?", "currency": "string?", "invoiceNumber": "string?", "rawText": "string?", "categories": "string[]?" }
```

`categories` is the user-editable category list from the UI's "Categories" panel (see below);
if omitted or empty the route falls back to `DEFAULT_CATEGORIES` from `lib/categories.ts`.

Success (`200`):
```json
{ "success": true, "data": { "category": "<one of the requested categories>", "confidence": 0 } }
```

Failure (`500`): `{ "error": "<message>" }`. Known cases: missing `OPENROUTER_API_KEY`,
non-OK response from OpenRouter (message includes a hint to check
`OPENROUTER_MODEL` against https://openrouter.ai/models?max_price=0), or the model's response not
being parseable JSON after stripping ` ```json ` fences (raw content is included in the error
body for debugging).

Category list: no longer hardcoded server-side — `lib/categories.ts` exports `DEFAULT_CATEGORIES`
(seeded with a UK-accounting-style chart-of-accounts list: Accountancy Fees, Advertising and PR,
Amortisation of Goodwill, etc.) used both as the client's initial category set and the server's
fallback when a request omits `categories`. The client persists its working list to
`localStorage` (key in `CATEGORIES_STORAGE_KEY`) and sends it with every `/api/classify` call. The
prompt instructs the model to pick exactly one from whatever list it's given and return raw JSON
only — there is still no server-side validation that the returned `category` is actually in that
list, so a misbehaving model could return an out-of-list value un-caught.

## Error-handling policy

Every route wraps its entire body in try/catch and always resolves to a JSON body with an
`error` string in plain English on failure — the point is that the frontend, and a human eyeballing
network traffic, never sees a bare Next.js crash page or an English stack trace. When adding new
failure paths, match this: catch close to the operation that can fail, translate to a specific
English message, don't let anything bubble to an unguarded top-level throw.

## Configuration

| Var | Consumed by | Notes |
|---|---|---|
| `OPENROUTER_API_KEY` | `/api/ocr`, `/api/classify` | sent as `Authorization: Bearer`; now required by both routes since `/api/ocr` also uses it for field extraction |
| `OPENROUTER_MODEL` | `/api/ocr`, `/api/classify` | defaults to `openai/gpt-oss-20b:free` if unset |

Both routes treat a missing key as a normal, expected failure mode (POC users often won't have
keys configured yet) — not an exceptional crash. Tesseract.js needs no API key or account at all.

## Known limitations / explicitly out of scope

- No auth, no rate limiting, no per-file size/type validation beyond the browser's `accept`
  attribute (which still lists `.pdf` even though `/api/ocr` rejects PDFs — revisit if PDF support
  is added, e.g. via a `pdfjs-dist` rasterization step before handing pages to Tesseract).
- No persistence layer — results exist only in browser memory for the session.
- Sequential (not parallel/batched) processing of rows; fine for POC-scale test batches, would
  need reworking for volume. Each `/api/ocr` call also creates and terminates its own Tesseract
  worker rather than reusing one across requests — simplest correct thing for sequential POC
  usage, but adds per-request startup overhead if this ever needs to run in a hot loop.
- Next.js is pinned to 14.x; several `npm audit` "high" advisories only have fixes in Next 16
  (SSRF/cache-poisoning classes relevant to self-hosted production deployments) — acceptable
  because this only ever runs on `localhost`. Revisit before any non-local deployment.
