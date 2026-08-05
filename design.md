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
- The "Settings" toolbar button opens a `<dialog>` with two toggle switches (`AppSettings` in
  `lib/settings.ts`, `visionOcrAssist`/`visionClassifyAssist`, both default `false`) — same
  `localStorage`-persisted pattern as Categories (`SETTINGS_STORAGE_KEY`, loaded in a `useEffect`
  to avoid an SSR hydration mismatch). Both are opt-in because each adds an extra OpenRouter
  round-trip on top of the normal pipeline. `visionOcrAssist` is sent as a `useVisionAssist` form
  field on every `/api/ocr` call; `visionClassifyAssist` gates whether `runClassify()` also
  base64-encodes the row's image (`fileToDataURL`, `FileReader.readAsDataURL`) and sends it as
  `imageDataUrl` alongside `useVisionAssist` on `/api/classify` — skipped for PDF rows regardless
  of the setting, since there's no single rendered page image to send client-side. See the API
  contracts section below for what each route does with these fields.
- The "Help" toolbar button opens a `<dialog>` with a static numbered walkthrough of the
  upload → OCR → view → classify → categories → export flow — pure copy, no state, same
  `showModal()`/`close()` pattern as the other dialogs.
- **Image zoom/pan** (`previewZoom` state, `imageWrapRef`/`dragState` refs): zoom buttons set
  `previewZoom` (0.5–4, step 0.25) which drives an inline `width: N%` style on the `<img>` once
  zoomed past 100%; below that, hovering shows a magnifier lens instead (`handleImageMouseMove`).
  Two non-obvious CSS/DOM gotchas here, both fixed but worth knowing if the zoom/pan feel ever
  regresses: (1) `.dialog-image-wrap` is a flex container, and a flex item's default
  `flex-shrink: 1` keeps shrinking the `<img>` back toward the container's width no matter how
  large the inline `width: N%` is set — the zoom toolbar's percentage label kept climbing past
  ~125% while the image visibly stopped growing, since flexbox was quietly overriding the width.
  Fixed with `flex-shrink: 0` scoped to `.dialog-image-wrap-zoomed .dialog-image`. (2) `<img>`
  elements are natively draggable in every browser by default — grabbing a zoomed image to pan it
  was instead triggering the browser's built-in image drag-and-drop (a translucent thumbnail
  ghost following the cursor) instead of `handleImageWrapMouseMove`'s custom `scrollLeft`/`scrollTop`
  panning. Fixed with `draggable={false}` + `onDragStart={e => e.preventDefault()}` on the `<img>`,
  plus `user-select: none` on the zoomed wrap so drag doesn't also select surrounding text.

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
  `os.tmpdir()/poc-invoice-ocr-tesseract-cache` via the `cachePath` option, and terminated
  (fire-and-forget, not awaited — see Deployment section) after every page has been processed — no
  external OCR service, no signup, no card required. This used to be a repo-relative
  `.tesseract-cache/` folder, which worked locally but crashed on Vercel: the deployment bundle is
  read-only, so the `fs.mkdirSync` that pre-creates the cache dir threw at module-import time
  (before the route's try/catch even exists), taking the whole function down and returning an HTML
  500 instead of a JSON error. `os.tmpdir()` is writable both locally and on serverless hosts, at
  the cost of not persisting the cache across separate `next dev` restarts — an acceptable trade
  for a POC.
- **Preprocessing + dual-pass OCR** (`recognizeText` in `route.ts`): each page/image is resized
  toward a target range (downscaled past `MAX_OCR_DIMENSION`/2000px, or upscaled below
  `MIN_OCR_DIMENSION`/1600px — a small photo's text can be only a couple of pixels wide, which
  Tesseract reads unreliably), then run through classic OCR preprocessing: grayscale, contrast
  stretch to use the full 0–255 range, then Otsu-threshold binarization (turns faint thermal-paper
  print into solid black-on-white). This binarized "enhanced" pass runs first. Binarization can
  occasionally crush faint print or colored ink to white that a plain grayscale pass would have
  caught, so — budget permitting (`canAffordSecondPass`, gated purely on remaining time, not on how
  the first pass looks) — a **second pass runs against the plain (non-binarized) grayscale
  variant, and both raw texts are combined, not chosen between**: they're labeled ("OCR PASS
  A"/"OCR PASS B") and handed to the field-extraction prompt together, with instructions to
  cross-reference every field between the two rather than have either the code or the model
  discard one pass's clearer reading of some fields just because its reading of *other* fields was
  worse. (An earlier version of this picked whichever pass had the higher Tesseract mean
  confidence — replaced because a "more confident" pass can still have blank/wrong individual
  fields that the "less confident" pass read correctly.) This roughly doubles per-page OCR time
  when both passes run — acceptable for this POC's accuracy-over-speed goal, but see the timeout
  architecture note below for why it can't blow the request budget even so.
- **Opt-in third source: vision-model assist** (`visionTranscribe` in `route.ts`, off by default —
  turned on via the Settings dialog's "AI vision assist for OCR" toggle, sent as a
  `useVisionAssist` form field). When enabled, a vision-capable OpenRouter model
  (`OPENROUTER_VISION_MODEL`, default `nvidia/nemotron-nano-12b-v2-vl:free` — chosen for its strong
  OCRBench/DocVQA benchmark scores among currently-free vision models) is sent the resized image
  directly and asked to transcribe visible text verbatim, labeled "OCR PASS C" and combined with
  passes A/B the same way — deliberately kept as plain text transcription rather than a separate
  structured-field-extraction call, so it reuses `extractReceipts`'s existing cross-referencing
  prompt instead of needing a whole parallel field-merging codepath. The vision request is started
  *before* the two Tesseract passes and only awaited at the end of `recognizeText`, so its network
  latency overlaps with Tesseract's CPU-bound `worker_thread` computation instead of stacking on
  top of it sequentially — without this, a third source usually wouldn't fit the same per-page
  time budget (worker startup + two 18s-ceiling OCR passes already uses most of the 50s deadline in
  the worst case). If the vision call fails or times out, it's silently dropped (`.catch(() => "")`)
  — vision assist is strictly best-effort and never fails the whole request.
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
{ "vendorName": "string?", "totalAmount": "number?", "currency": "string?", "invoiceNumber": "string?", "rawText": "string?", "categories": "string[]?", "useVisionAssist": "boolean?", "imageDataUrl": "string?" }
```

`categories` is the user-editable category list from the UI's "Categories" panel (see below);
if omitted or empty the route falls back to `DEFAULT_CATEGORIES` from `lib/categories.ts`.

`useVisionAssist`/`imageDataUrl` are opt-in (see the Settings dialog note above) — when
`useVisionAssist` is `true` **and** `imageDataUrl` is a non-empty base64 data URL, the request to
OpenRouter becomes multimodal (`content: [{type: "text", ...}, {type: "image_url", ...}]`) and
uses `OPENROUTER_VISION_MODEL` instead of `OPENROUTER_MODEL`, so the model can see the actual
document image (logo, letterhead, layout) alongside the extracted text fields when picking a
category. Either condition missing silently falls back to the normal text-only prompt — this is
always the case for a PDF row from the client (see the UI section above for why).

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
| `OPENROUTER_VISION_MODEL` | `/api/ocr`, `/api/classify` | defaults to `nvidia/nemotron-nano-12b-v2-vl:free`; only used when the client opts in via the Settings dialog (`useVisionAssist`) |

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
- Even after fixing the crash above, a **504** followed for the exact same test file — initially
  assumed to be an oversized-image/CPU problem (Vercel's Hobby-tier CPU allocation is modest, and
  Tesseract's OCR time scales with pixel count), so `recognizeText` now downscales any image
  (photo, screenshot, or rendered PDF page) to `MAX_OCR_DIMENSION` (2000px on the longest side)
  before handing it to Tesseract — see the note by that constant in `route.ts` for the accuracy
  trade-off. This is a reasonable thing to have anyway, but it turned out **not** to be the actual
  cause: the test file was a 508×699 invoice, nowhere near that cap. Timing each phase directly
  (`worker creation` / `recognize` / the OpenRouter call) found the real bottleneck — see the next
  two bullets.
- Without an explicit `langPath`, tesseract.js fetches `eng.traineddata.gz` from jsDelivr's CDN on
  every cold start, since the writable `/tmp` cache doesn't persist between invocations there. This
  network dependency is now eliminated: the `@tesseract.js-data/eng` npm package ships the exact
  same file, so `langPath` points at the copy already sitting in `node_modules` in the deployment
  bundle — a plain local file read, same content, zero network calls. (Measured locally: worker
  creation + OCR of the sample invoice = ~2s combined either way — this wasn't the dominant cost,
  but it's a real, unpredictable-latency network call removed for free.)
- **A real but incomplete lead**: the free OpenRouter model's response time is genuinely wildly
  inconsistent — as low as ~2s and as high as ~48s for the *identical* prompt sent moments apart in
  the same test session — and both routes wrap their OpenRouter `fetch` in an `AbortController`
  (`OPENROUTER_TIMEOUT_MS`: now 25s for `/api/ocr`, 20s for `/api/classify`) so a slow response
  becomes this repo's normal friendly JSON error instead of an opaque platform-level 504. This was
  originally logged as "the actual dominant cost" — **that conclusion was wrong**, or at least
  incomplete: it explained *a* source of slow responses, but not the one that kept `/api/ocr`
  504ing in production long after this fix shipped. See the next bullet for the real root cause.
- **The real root cause, found via a `logger` progress hook + a lot of bisection**: `/api/ocr` kept
  hitting a raw platform 504 (bare HTML, `FUNCTION_INVOCATION_TIMEOUT`, no JSON) at almost exactly
  the 60s `maxDuration` mark, no matter how tightly the OpenRouter timeout, the Tesseract `recognize()`
  call, or even `createWorker()` itself were individually raced against their own timeouts —
  because none of those timeouts ever got a chance to fire. `createWorker()`'s own setup chain
  (`worker-script/index.js`'s `load()`) calls the Emscripten WASM factory with **no `.catch()`** on
  the returned promise; tesseract.js-core's `.wasm` binary was silently missing from the deployed
  Vercel function (reachable in that package only via a runtime-computed `require()`, which
  Vercel's build-time file tracer doesn't follow — a documented, recurring issue for tesseract.js
  on Vercel), so the WASM factory call never resolved *or* rejected. `createWorker()` hung forever,
  and every timeout downstream of it — no matter how well-designed — was strictly unreachable.
  Wiring `createWorker()`'s `logger` option to record the last-seen startup status and including it
  in the (newly added) worker-startup timeout's error message turned the next production request
  into `"stuck at: initializing tesseract (0%)"` — a direct pointer at the WASM factory call. Fixed
  via `next.config.js`'s `experimental.outputFileTracingIncludes`, forcing
  `tesseract.js-core/**/*.wasm` into the trace. Fixing that surfaced the exact same bug one layer
  deeper: `@tesseract.js-data/eng`'s `eng.traineddata.gz` is *also* only reachable via a
  runtime-computed path (`LANG_DATA_PATH`, built with `path.join(...)`, never a literal
  require/import), so it was equally invisible to the tracer — the next request hung at
  `"stuck at: loading language traineddata (0%)"` until that path was force-included too. Verified
  end-to-end against the deployed URL after both fixes: `200 OK` in 48s (cold) then 24s (warm), with
  correctly extracted fields. See the `outputFileTracingIncludes` bullet in CLAUDE.md's Conventions
  section — this is a load-bearing gotcha for *any* future dependency that loads an asset via a
  computed path rather than a literal import, not just tesseract.js.
- **Timeout architecture, end to end** (`app/api/ocr/route.ts`): a single `deadline` is computed
  at the very top of the `POST` handler — before `formData()` parsing, PDF rasterization, or
  `createWorker()`, all of which count against Vercel's `maxDuration` whether or not they're
  counted in our own budget (an earlier version of this started the clock *after* worker creation,
  which left a real gap: slow startup wasn't in our budget but was in Vercel's). Everything downstream
  is raced against that one deadline: `createWorker()` itself (`WORKER_STARTUP_TIMEOUT_MS`, 20s —
  tesseract.js has no internal timeout anywhere in its own setup chain, so this was added
  defensively even after the tracing fix, since a *slow* startup is still plausible on a cold,
  CPU-constrained instance even once a *hung* one no longer is), each individual OCR pass
  (`OCR_TIMEOUT_MS`, 18s), and the field-extraction LLM call (`OPENROUTER_TIMEOUT_MS`, capped to
  whatever's left of the deadline, floored at `LLM_MIN_MS`/8s so a slow OCR pass can never starve
  it entirely). A second OCR pass (see the dual-pass bullet above) only ever runs if
  `OCR_TIMEOUT_MS + LLM_MIN_MS` of budget remains — this is a pure time-budget gate, unrelated to
  OCR confidence. `worker.terminate()` is fire-and-forget (not awaited): tesseract.js runs OCR
  synchronously inside its `worker_threads` thread, so terminating a worker that a timeout raced
  past mid-`recognize()` could itself block until that computation yields, silently re-adding the
  exact delay the timeouts exist to cap. None of this raises the actual 60s ceiling — if a page
  is slow enough, the request still fails — but it guarantees the failure is this repo's normal
  friendly JSON error, not an opaque platform-level 504, and a multi-page PDF returns whatever
  pages already succeeded instead of losing all of them to a late failure.

## Known limitations / explicitly out of scope

- No auth, no rate limiting, no per-file size/type validation beyond the browser's `accept`
  attribute and the server-side `MAX_PDF_PAGES` cap.
- PDF pages are rasterized at a fixed `scale: 2.0` in `renderPdfToPageImages` — no attempt to
  adapt resolution to page size/DPI, so very large or very small page geometries may OCR worse
  than a typically-sized scanned page. Both that and any oversized plain-image upload are then
  capped at `MAX_OCR_DIMENSION` (2000px longest side, see Deployment section above) before OCR —
  a deliberate speed/timeout trade-off that could theoretically lose some detail on a very
  high-resolution, densely-printed source document.
- Multi-receipt detection depends entirely on the LLM correctly splitting OCR text that has no
  structural markers between receipts — there's no image-level segmentation (e.g. detecting
  physical receipt boundaries before OCR), so accuracy degrades on cluttered or overlapping scans.
- The free OpenRouter model's latency is itself a reliability limitation, not just a speed one —
  see the Deployment section above. `OPENROUTER_TIMEOUT_MS` turns a slow response into a clean
  error instead of a platform-level crash, but a request can still legitimately fail because the
  free tier was momentarily slow/overloaded, with no retry built in. A user hitting "OCR Error"
  should just be told to try again before assuming something is actually broken.
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
- Dual-pass OCR (see the "Preprocessing + dual-pass OCR" bullet above) roughly doubles per-page
  Tesseract time whenever both passes run, which is most of the time now that the gate is purely
  time-budget-based rather than confidence-based. Accepted trade-off for this POC's accuracy goal,
  but worth remeasuring if request latency on Vercel becomes a complaint again.
- Vision-model assist (both OCR and Classification — see the respective bullets above) is
  implemented but **opt-in and off by default**, specifically because it adds real latency and
  OpenRouter free-tier rate-limit pressure on top of the already-dual-pass Tesseract OCR (429s from
  the shared free pool were directly observed during normal testing in this session, even before
  adding a third/fourth call). A user who turns both toggles on for a batch of files should expect
  to hit free-tier limits sooner than with the defaults. `google/gemma-4-31b-it:free` is a
  reasonable general-purpose alternative to the default `OPENROUTER_VISION_MODEL` if the Nemotron
  model stops being free or available — always re-check
  https://openrouter.ai/models?max_price=0 (filter for vision/image input) before relying on either.
  **Directly measured, not just theorized:** with vision assist on, `nvidia/nemotron-nano-12b-v2-vl:free`
  itself timed out on both the OCR pass and the classify call in back-to-back local tests, and on
  the OCR side it also starved the *text* extraction call down to its `LLM_MIN_MS` floor, causing a
  failure that wouldn't have happened with vision off. This is the concrete reason to leave both
  toggles off unless specifically evaluating vision assist — turning them on trades a working
  default pipeline for a currently-unreliable one, not a strict accuracy upgrade.
- `OPENROUTER_TIMEOUT_MS` in `/api/ocr` was originally 25s despite this file's own note (right
  above) that the free model can take up to ~48s — it was set early in this session before OCR's
  actual speed was measured, and was left too conservative: OCR itself typically finishes in
  ~1-2s, so by the time the extraction call starts there's usually ~48s of `REQUEST_DEADLINE_MS`
  still unused, but the 25s ceiling threw that slack away regardless and was cutting off a real
  share of responses that would otherwise have completed. Raised to 42s (and `/api/classify`'s
  from 20s to 26s, since that route has no OCR overhead at all). `Math.min(OPENROUTER_TIMEOUT_MS,
  deadline - Date.now())` at each call site still naturally shrinks this when something upstream
  genuinely did eat into the budget — see the vision-assist bullet above for exactly that case.
