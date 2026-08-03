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
┌─────────────┐  multipart/form-data     ┌──────────────────┐
│  page.tsx   │ ───────────────────────► │  /api/ocr         │──┐
│ (client)    │  (image, or PDF —        │  (route.ts)       │  │ image or PDF buffer
│             │   rasterized per page)   │                    │  ▼
│             │ ◄── [{vendorName,…},…] ──│                    │  pdfjs-dist rasterize (PDF only)
│  row state  │      (one array entry    │                    │  → Tesseract.js worker (local, eng)
│  per file,  │       per receipt found) │                    │    → raw text per page
│  fanned out │                          │                    │──┐
│  1-file→N   │                          └──────────────────┘  │ field-extraction prompt (→ array)
│  rows       │        JSON                    ┌──────────────────┐
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

- Clicking "View" (or "Show Error", for a row that has one) on a row opens a native `<dialog>`
  (`detailDialogRef`, `showModal()`/`close()` driven by `selectedRowId` state) showing every
  extracted field (`DETAIL_FIELDS`) plus an image/PDF preview built from the row's original `File`
  via `URL.createObjectURL` (revoked on close/row change). PDFs render via an `<iframe>` (the
  browser's native PDF viewer) instead of `<img>`, with a `#page=N` fragment appended from the
  row's `pageNumber` so it opens on the right page. Native `<dialog>` was chosen over a hand-rolled
  overlay because it gets focus trapping, Escape-to-close, and focus restoration to the trigger
  element for free per the HTML spec — backdrop-click-to-close is the one bit added manually
  (checking `e.target === dialogRef.current` in the dialog's own `onClick`).
- **Error display**: the table's Error column is a "Show Error" button (only rendered when
  `row.error` is set), not the raw error text — long messages used to be silently truncated by
  `.cell-truncate`. The button opens the same detail dialog, which renders the full message in a
  `.dialog-error-banner` above the field grid.
- **Editable fields**: once a row has an OCR result and isn't actively being processed
  (`EDITABLE_STATUSES = ["ocr_done", "ocr_error", "classify_done", "classify_error"]`), every
  `DETAIL_FIELDS` entry except `category`/`confidence`/`pageNumber` (marked `editable: false` —
  they're classification output or structural metadata, not something to hand-correct) renders as
  an `<input>` instead of static text. `handleDetailFieldChange` writes straight into row state via
  `updateRow`, so edits are picked up by `runClassify()` on the next Step 2 run — the intended flow
  is: run OCR, open a row, fill in whatever Tesseract/the LLM missed, then classify. Empty/`null`
  fields get a `.detail-input-empty` highlight (amber border) so gaps are easy to spot before
  classifying. There's no persistence beyond in-memory row state, same as everything else here.
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

Request: `multipart/form-data`, single field `file` — an image, or a PDF (each page is rasterized
to an image before OCR).

Success (`200`) — **`data` is always an array**, even for a single-page image with one receipt on
it, because a page/photo can contain more than one receipt:
```json
{
  "success": true,
  "data": [
    {
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
      "rawText": "string (first 2000 chars of that page's Tesseract.js OCR output)",
      "pageNumber": "number | null (1-based PDF page, or null for a plain image upload)"
    }
  ]
}
```

`transactionType`/`description`/`debitAmount`/`creditAmount`/`balance`/`accountName`/`accountNumber`/
`sortCode` are bank-statement-style fields; `vatNumber`/`merchantAddress`/`paymentMethod`/`subtotal`/
`receiptTime` are UK-retail-receipt fields. Both groups are added alongside the original invoice
fields so the same pipeline covers invoice photos, UK receipts, and bank-statement line images —
whichever fields don't apply to the scanned document come back `null` rather than being guessed.

`app/page.tsx` fans a multi-entry response out into multiple table rows (`expandRow`) rather than
concatenating fields — see the row detail modal section above.

Failure (`400`/`500`): `{ "error": "<message>" }`. Known cases: no file, malformed request body
(not multipart), a PDF with more pages than `MAX_PDF_PAGES` (15) or that pdfjs-dist can't parse
(corrupted/password-protected), missing `OPENROUTER_API_KEY` (required — it powers field
extraction, not just classification), Tesseract producing empty text on every page (blurry/corrupt
scan), or the field-extraction LLM call failing / returning unparseable JSON.

Implementation notes:
- PDF pages are rasterized with `pdfjs-dist` (`legacy/build/pdf.mjs`, dynamically imported with a
  **literal** specifier — see the `next.config.js` note in CLAUDE.md) using its Node-auto-selected
  canvas factory, which is backed by `@napi-rs/canvas` (no native-build/`node-canvas` dependency).
  `renderPdfToPageImages` throws before OCR'ing anything if `doc.numPages > MAX_PDF_PAGES` (15), to
  bound per-request cost — each page triggers its own OCR pass plus LLM call downstream.
- OCR is fully local: **one** Tesseract.js worker is created per request (reused across all pages
  of a multi-page PDF) with `langs: ["eng"]`, trained-data cached under
  `os.tmpdir()/poc-invoice-ocr-tesseract-cache` via the `cachePath` option, and terminated after
  every page has been processed — no external OCR service, no signup, no card required. This used
  to be a repo-relative `.tesseract-cache/` folder, which worked locally but crashed on Vercel: the
  deployment bundle is read-only, so the `fs.mkdirSync` that pre-creates the cache dir threw at
  module-import time (before the route's try/catch even exists), taking the whole function down
  and returning an HTML 500 instead of a JSON error. `os.tmpdir()` is writable both locally and on
  serverless hosts, at the cost of not persisting the cache across separate `next dev` restarts —
  an acceptable trade for a POC.
- Tesseract only returns raw text, no structured fields — there's no field-unwrapping helper.
  Instead, each page's raw text is sent to the OpenRouter chat model (`extractReceipts` in
  `route.ts`) with a prompt asking for a JSON **array** of `{vendorName, invoiceNumber, ...}`
  objects — one per distinct receipt the model finds in that page's text — parsed the same way
  `/api/classify` parses its response (strip ```json fences, then `JSON.parse`; a bare object
  response is wrapped in a 1-element array as a defensive fallback in case the model ignores the
  array instruction). `toStringOrNull`/`toNumberOrNull` coerce the LLM's (untrusted) field types
  before `buildExtractedData` returns them to the client.
- Because field extraction now goes through an LLM instead of a purpose-built invoice model,
  accuracy depends more on OCR text quality and prompt wording than before — worth watching when
  evaluating this stage's feasibility. Multi-receipt splitting adds another accuracy axis: the
  model can still merge or mis-split receipts on a cluttered page, especially with a lot of OCR
  noise.

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

This guarantee only covers responses that actually reach our route handlers — a dev server mid
hot-reload/recompile, or a broken build, can still make Next itself serve an HTML error overlay
for the request. `app/page.tsx`'s `parseApiResponse` guards both `fetch` call sites against this:
it reads the body as text and only then attempts `JSON.parse`, so a non-JSON response surfaces as
"Server returned a non-JSON response (HTTP …)" instead of the cryptic
`Unexpected token '<' ... is not valid JSON` that a bare `res.json()` throws on an HTML body.

## Configuration

| Var | Consumed by | Notes |
|---|---|---|
| `OPENROUTER_API_KEY` | `/api/ocr`, `/api/classify` | sent as `Authorization: Bearer`; now required by both routes since `/api/ocr` also uses it for field extraction |
| `OPENROUTER_MODEL` | `/api/ocr`, `/api/classify` | defaults to `openai/gpt-oss-20b:free` if unset |

Both routes treat a missing key as a normal, expected failure mode (POC users often won't have
keys configured yet) — not an exceptional crash. Tesseract.js needs no API key or account at all.

## Deployment (Vercel)

This app is also deployed to Vercel (serverless Node functions), not just run locally — that
constrains anything the API routes do:
- `.env.local` isn't deployed; `OPENROUTER_API_KEY`/`OPENROUTER_MODEL` must be set as Vercel
  Project → Settings → Environment Variables, and a redeploy is needed after changing them.
- The deployment bundle is read-only; only `/tmp` is writable, and it isn't guaranteed to persist
  between invocations. See the `TESSERACT_CACHE_PATH` note above — this bit Vercel specifically
  (worked locally, crashed in prod) because the failure was a top-level `fs.mkdirSync` throwing at
  module-import time, before the route handler's try/catch existed to catch it.
- Both routes set `export const maxDuration` (`/api/ocr`: 60s, the Hobby-plan ceiling; `/api/classify`:
  30s) since the default 10s is too tight for Tesseract + PDF rasterization + an OpenRouter call,
  particularly on a cold start that has to re-download trained-data into the now-empty `/tmp`.
- `@napi-rs/canvas` ships prebuilt native binaries per platform; Vercel's build step runs on the
  same Amazon Linux target as the function runtime, so `npm install` during the Vercel build picks
  the matching prebuild automatically — no extra config needed, but worth knowing if a future
  dependency doesn't publish a Linux prebuild.

## Known limitations / explicitly out of scope

- No auth, no rate limiting, no per-file size/type validation beyond the browser's `accept`
  attribute and the server-side `MAX_PDF_PAGES` cap.
- PDF pages are rasterized at a fixed `scale: 2.0` in `renderPdfToPageImages` — no attempt to
  adapt resolution to page size/DPI, so very large or very small page geometries may OCR worse
  than a typically-sized scanned page.
- Multi-receipt detection depends entirely on the LLM correctly splitting OCR text that has no
  structural markers between receipts — there's no image-level segmentation (e.g. detecting
  physical receipt boundaries before OCR), so accuracy degrades on cluttered or overlapping scans.
- No persistence layer — results exist only in browser memory for the session; row edits made in
  the detail modal are lost on refresh just like everything else.
- Sequential (not parallel/batched) processing of rows and PDF pages; fine for POC-scale test
  batches, would need reworking for volume. Each `/api/ocr` call creates and terminates one
  Tesseract worker (reused across all pages of a single request, but not across requests) —
  simplest correct thing for sequential POC usage, but adds per-request startup overhead if this
  ever needs to run in a hot loop.
- Next.js is pinned to 14.x; several `npm audit` "high" advisories only have fixes in Next 16
  (SSRF/cache-poisoning classes). This POC is deployed to Vercel now, not just `localhost` — this
  hasn't been revisited against that, and should be before treating the Vercel deployment as
  anything more than a convenience demo link.
