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
  ├─ "Settings" button → native <dialog> with two opt-in toggles (persisted to localStorage,
  │  `lib/settings.ts`): AI vision assist for OCR, and for Classification — see below
  ├─ "Help" button → native <dialog> describing the end-to-end flow
  └─ CSV export — pure client-side (Blob + URL.createObjectURL, UTF-8 BOM)
```

- **`app/api/ocr/route.ts`**: accepts `multipart/form-data` (field `file`, image **or PDF**). A PDF
  is rasterized page-by-page with `pdfjs-dist` + `@napi-rs/canvas` (capped at `MAX_PDF_PAGES`
  pages, currently 15) since Tesseract.js can't read PDF directly; a plain image is treated as one
  page. Every page/image is resized toward a target range before OCR — downscaled to
  `MAX_OCR_DIMENSION` (2000px longest side) if oversized (full-resolution photos/screenshots make
  Tesseract dramatically slower without more accuracy, and this also keeps requests inside
  Vercel's function timeout), or upscaled to `MIN_OCR_DIMENSION` (1600px) if undersized (a small
  photo's text can be only a couple of pixels wide, which Tesseract reads unreliably — observed
  directly on a real invoice at native ~500×700 resolution). Each resized page/image then gets
  **two** OCR passes when there's time for both: grayscale + contrast-stretch + Otsu-binarized
  (the default, best for typical printed receipts) and plain grayscale (no binarization — catches
  faint print or colored ink that binarization can crush to white). The two passes are **combined,
  not chosen between** — both raw texts are labeled ("OCR PASS A"/"OCR PASS B") and handed to the
  field-extraction prompt together with instructions to cross-reference them per-field, since the
  two failure modes are uncorrelated and picking one by Tesseract's own confidence score would
  needlessly throw away whichever pass merely *looked* worse. See `recognizeText` in `route.ts`.
  A third, **opt-in** source can join these two: when the client sends `useVisionAssist: "true"`
  (driven by the Settings dialog's "AI vision assist for OCR" toggle, off by default —
  `lib/settings.ts`), a vision-capable OpenRouter model (`OPENROUTER_VISION_MODEL`, default
  `nvidia/nemotron-nano-12b-v2-vl:free`) is sent the image directly and asked to transcribe visible
  text verbatim (`visionTranscribe`) — labeled "OCR PASS C" and combined the same way as A/B. This
  call is kicked off *before* the two Tesseract passes and only awaited afterward, so its network
  latency overlaps with Tesseract's CPU-bound `worker_thread` computation instead of stacking on
  top of it — the only way a third source fits in the same per-page time budget. Each pass runs
  through a Tesseract.js worker (`createWorker(["eng"], ...)`, trained-data cached
  under `os.tmpdir()/poc-invoice-ocr-tesseract-cache` — **not** under the repo/`cwd()`, since
  serverless hosts like Vercel ship a read-only deployment bundle and only `/tmp` is writable there
  — and loaded via an explicit `langPath` pointing at the `@tesseract.js-data/eng` package already
  in `node_modules`, so the trained-data file is read from the bundle instead of fetched from
  jsDelivr's CDN on every cold start). The combined OCR text is then sent to the same OpenRouter
  chat model used for classification with a field-extraction prompt asking for a JSON **array** of
  receipts — a single page/photo commonly contains more than one receipt, so the model is asked to
  split them instead of merging their fields. That OpenRouter call is wrapped in an
  `AbortController` timeout (`OPENROUTER_TIMEOUT_MS`) — the free model's response time is highly
  variable in practice (single-digit seconds to 40+ seconds for the same prompt), and without this
  Vercel's own `maxDuration` kill produces a bare HTML 504 instead of our JSON error format;
  aborting first turns a slow model into a normal, friendly error. `createWorker()` itself and
  every individual OCR pass are *also* raced against their own timeouts
  (`WORKER_STARTUP_TIMEOUT_MS`, `OCR_TIMEOUT_MS`) against a single overall `deadline` computed at
  the top of the handler (before any parsing/rasterization/worker-startup work, all of which counts
  against Vercel's `maxDuration` whether or not it's inside our own budget) — see the "Vercel
  serverless gotchas" bullet below for why this mattered in practice, not just in theory. Each array entry
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
  omitted or empty — that list is no longer hardcoded in this route. **Opt-in vision assist**: if
  the request body has `useVisionAssist: true` **and** a non-empty `imageDataUrl` (a base64 data
  URL, built client-side from the row's `File` via `FileReader` — see `fileToDataURL` in
  `app/page.tsx`), the prompt's `content` becomes a multimodal array (`text` + `image_url`) sent to
  `OPENROUTER_VISION_MODEL` instead of `OPENROUTER_MODEL`, so the model can use visible logo/
  letterhead/layout to help disambiguate the category. Silently falls back to text-only
  classification if either condition isn't met — this is always the case for a PDF row, since
  there's no single rendered page image on the client to send (the OCR route rasterizes PDF pages
  server-side and doesn't keep the result).
- **`lib/types.ts`**: the only cross-cutting module — `RowStatus`, `OcrExtractedData`,
  `ClassifyResult` are shared between both API routes and `app/page.tsx`. Change a field shape
  here first if extending the pipeline.
- **`lib/categories.ts`**: `DEFAULT_CATEGORIES` (seed list) and `CATEGORIES_STORAGE_KEY` (the
  `localStorage` key the client persists its editable category list under) — shared between
  `app/page.tsx` and `/api/classify`.
- **`lib/settings.ts`**: `AppSettings` (`visionOcrAssist`/`visionClassifyAssist`, both default
  `false`), `DEFAULT_SETTINGS`, and `SETTINGS_STORAGE_KEY` — same persisted-to-`localStorage`
  pattern as `lib/categories.ts`, read/written by the Settings dialog in `app/page.tsx`.
- **`app/ai-test/route.ts`**: `GET /ai-test`, a plain-text connectivity check — confirms
  `OPENROUTER_API_KEY` is set and OpenRouter actually responds, without uploading a file through
  the full OCR pipeline first. Not linked from the UI; visit it directly (locally or on the
  deployed URL) when diagnosing whether a failure is the API key/OpenRouter itself vs. something
  else. Must set `dynamic = "force-dynamic"` and `cache: "no-store"` on its `fetch` — otherwise
  Next statically caches the whole route (and/or the fetch call) at build time and every visit
  replays the same frozen response instead of testing anything live; this was caught by its
  latency reading a suspicious 0ms on every request.

## Conventions specific to this repo

- **Every user-facing error must be a friendly, plain-English string returned as JSON**
  (`{ error: "..." }` with a non-2xx status), never a raw thrown error or an empty 500 — this
  includes missing env vars, OpenRouter failures, and malformed request bodies. Both routes wrap
  their entire body in try/catch for this reason; keep that pattern for any new route.
- **Every OpenRouter `fetch` call must set `cache: "no-store"`** — Next.js patches the global
  `fetch` and will otherwise cache a POST body/response pairing by default. In practice this never
  corrupted `/api/ocr`/`/api/classify` output because every real request has different OCR text
  baked into the prompt (a naturally different cache key each time), but it was directly caught on
  `/ai-test`, which sends the same fixed prompt every call and started returning a frozen 0ms
  "response" instead of actually hitting OpenRouter.
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
- **Any file a route reads via a runtime-computed path (not a literal `require`/`import`) must be
  force-included in `next.config.js`'s `experimental.outputFileTracingIncludes`, or it silently
  won't exist in the deployed function on Vercel.** Vercel's build-time file tracer only reliably
  follows static `require()`/`import` calls; a path built at runtime via `path.join(...)` (like
  `LANG_DATA_PATH` in `/api/ocr`) or a require reached through several layers of a dependency's own
  internal logic (like `tesseract.js-core`'s `.wasm` binaries, chosen by runtime SIMD feature
  detection inside `getCore.js`) is invisible to it. This bit hard in practice: `/api/ocr` worked
  perfectly locally (where `npm run dev`/`npm start` always has the full `node_modules`, so this
  class of bug can never reproduce there) while hanging for the full 60s `maxDuration` and dying
  with a raw platform 504 in every Vercel deployment — because `tesseract.js`'s own WASM-loading
  promise chain has no `.catch()`, so a missing file doesn't error, it just never resolves, and
  `createWorker()` hangs forever with nothing downstream able to help. Both the `.wasm` files and
  `@tesseract.js-data/eng`'s `eng.traineddata.gz` are force-included this way now — check
  `route.js.nft.json` under `.next/server/app/api/ocr/` after a build if a similar "works locally,
  hangs/500s on Vercel" bug shows up again for a new dependency.
- Import alias `@/*` maps to the repo root (`tsconfig.json`), e.g. `@/lib/types`.
- Next.js is pinned to the 14.x line on purpose (matches the original spec); `npm audit` will
  show unresolved "high" advisories that only have fixes in Next 16 — see the note near the end
  of README.md before ever changing that.

## Demo/marketing layer (About modal, footer watermark, Full Vision page) — implemented

**Status: done.** All four tasks below have shipped — the app itself was also renamed to
demo-Accorix (browser tab title, `package.json` name, new favicon at `app/icon.svg`) as part of
the same effort, and `/vision` now has all 10 sections, not just the hero. Kept the original
task brief below as-is since it's still the accurate rationale for *why* each piece looks the way
it does — treat it as implementation notes, not a to-do list. Where things live:
- `app/page.tsx`: the About dialog (`aboutDialogRef`), the Help dialog's feasibility-demo callout,
  and the `demo-accorix-logo.svg` mark in the header.
- `app/layout.tsx`: the shared footer.
- `app/vision/`: `page.tsx` (Server Component, exports `metadata`) renders `VisionPageClient.tsx`
  ("use client", holds the hero's parallax listener), which composes ten section components under
  `app/vision/sections/` (`Hero`, `Problem`, `VisionSection`, `Roadmap`, `FirmFeatures`,
  `AdminPanel`, `Pipeline`, `Comparison`, `DemoStatus` — Footer is the shared layout footer, not a
  10th component). `Reveal.tsx` wraps `lib/useInView.ts` for the scroll-reveal treatment;
  `icons.tsx` holds the shared monoline SVG icon set every section draws from.

**Context.** This repo doubles as a live demo shown to a client who ultimately wants the
full-scale SaaS product described in `PRODUCT_VISION.md` (new file, sits next to this one —
read it before starting any of the work below, it's the copy source for task 4). Right now the
app is a bare OCR/classification tool with no framing: a first-time viewer has no way to tell
"this is a feasibility slice" from "this is the whole product." This section adds a thin
presentation layer around the existing tool to fix that — **no changes to the OCR/classify
pipeline itself**, this is UI-only work layered on top of what `design.md` already describes.

Do these four in order; 1–3 touch `app/page.tsx` and are small, 4 is a new route and is the
bulk of the work.

### 1. Update the Help dialog

The existing Help `<dialog>` (see design.md's "Row detail modal, categories panel & help
dialog" section) walks through upload → OCR → view → classify → categories → export. Keep that
walkthrough, but add two things above or below it:
- A short callout stating plainly that this is a feasibility demo of Phase 1 of a larger
  product (one or two sentences, pull the framing from `PRODUCT_VISION.md` §10 — don't
  editorialize beyond what that section says).
- A line pointing at the new "About" button and the new "Full Product Vision" link/button (tasks
  2 and 4) for anyone who wants more.

Same `showModal()`/`close()` pattern as the other three toolbar dialogs — don't introduce a
different modal mechanism for this one.

### 2. New "About" toolbar button → modal

Add an "About" button to the same toolbar row as Help/Categories/Settings, opening a fourth
native `<dialog>` (`aboutDialogRef`, same show/close/backdrop-click pattern as the existing
three — copy `helpDialogRef`'s wiring, don't reinvent it). Content, sourced from
`PRODUCT_VISION.md` §1–4 (Hero, Problem, Vision, Who it's for):
- Accorix wordmark/logo at the top (the same mark already used in the product's PRD —
  place the asset at `public/accorix-logo.png` or `.svg` if not already present).
- Tagline: "The Smarter Accounting Assistant."
- 2–3 short paragraphs: what this specific demo is, what the full product is, who it's for.
- A single CTA button/link to the Full Vision page (task 4) — `<Link href="/vision"
  target="_blank" rel="noopener noreferrer">`. **Must open in a new tab**, not navigate the
  current one — see the "why new tab" note under task 4, it's not a style preference.

**"Theme-friendly" requirement:** this modal (and the Full Vision page) must not hardcode colors
that only look right in one theme. If `app/globals.css` doesn't already expose a small set of CSS
custom properties for the palette (background, surface, text, muted text, border, accent), add
them there first and have every new component in this section reference `var(--...)` rather than
literal hex values. That's what "theme-friendly" means here in practice: not a light/dark toggle
that needs building today, but a component that won't need a rewrite the day one *is* added.
Suggested starting palette (Accorix brand — same navy/gold/teal used in the product's other
brand materials): `--accorix-navy: #16305C`, `--accorix-teal: #0F9D8D`, `--accorix-gold:
#C9A227`, plus whatever neutral bg/surface/text/border values already exist in this repo's
current styling (check `app/globals.css` before inventing new ones — reuse what's there).

### 3. Footer watermark

A slim, persistent footer at the bottom of the app shell (`app/layout.tsx`, so it appears on
every route including the new `/vision` page — a single shared component, not duplicated
markup). Unobtrusive: small text, muted color, not competing with the toolbar for attention.
Content: developer attribution with a GitHub profile link and an email link (`mailto:`).

**Both the GitHub URL and email are placeholders below — fill in the real values before
shipping, they weren't provided:**
```tsx
<footer className="app-footer">
  <span>Built by <a href="https://github.com/YOUR_USERNAME" target="_blank" rel="noopener noreferrer">YOUR_NAME</a></span>
  <span aria-hidden="true">·</span>
  <a href="mailto:you@example.com">you@example.com</a>
</footer>
```
Style it consistent with the CSS-variable palette from task 2 — a one-line footer, small font,
`var(--muted-text)`-equivalent color, links underlined only on hover.

### 4. Full Vision landing page — new route, not a modal

A real page at `app/vision/page.tsx` (→ `/vision`), separate from the tool. This is explicitly
**not** a modal — the brief calls for a full scrollable landing experience with multiple
sections, images, and scroll-triggered motion, which a `<dialog>` isn't suited for.

**Why it must open in a new tab (task 2's CTA, and any other link into this page):** every
table row, OCR result, and edit in this app lives only in React state in `app/page.tsx` — see
design.md's row state machine section — there is no persistence. Navigating the same tab away to
`/vision` and back would silently wipe any in-progress demo data. Always `target="_blank"` for
links into this route from the tool.

**Content structure** — one section per `PRODUCT_VISION.md` heading, in this order, each its own
`<section>` so scroll-reveal can target them independently:
1. Hero (§1) — logo, tagline, hero subhead explicitly framing this as "the full vision the demo
   you just saw is a slice of," two CTAs (scroll down / back to demo).
2. Problem (§2) — short, a few sentences plus maybe a simple 3-icon "today's tools are
   scattered" visual.
3. Vision / North Star (§3) — feature the human-in-the-loop callout from that section
   prominently (styled like the callout box already used in the product's own PRD document —
   left accent bar, tinted background, not just a plain paragraph).
4. Roadmap (§5) — the three-phase table rendered as a horizontal (desktop) / vertical (mobile)
   timeline, Phase 1 visually marked as "current" (this demo).
5. Firm-side features (§6) — a responsive card grid, one card per bullet, short icon + heading +
   one-line description per card (inline SVG icons are fine — keep this dependency-free, see
   below).
6. Admin panel (§7) — same card-grid treatment, visually distinguished from §6 (e.g. a different
   accent color or a darker section background) since it's a different audience (Accorix staff,
   not the firm).
7. Pipeline (§8) — the seven-step flow, animated so each step reveals as the user scrolls past
   it rather than rendering all at once; a simple connected vertical line with a node per step
   reads clean on both desktop and mobile.
8. Why not Xero/QuickBooks + Dext (§9) — a short, honest comparison; don't oversell, the source
   content itself says to be honest about the trade-off.
9. Demo status (§10) — plain-spoken "here's exactly what you're looking at today," linking back
   to the actual tool (`target="_blank"` again, or a normal same-tab link since this is the
   *intended* exit point of the page).
10. Footer — reuse the task-3 footer component.

**Scroll animation approach — no new dependency by default.** This repo deliberately stays
light on dependencies (see the Next 14 pin, the "why not vision-LLM cross-check" trade-off in
design.md, etc.); match that instinct here. Implement a small `useInView` hook wrapping
`IntersectionObserver` (`threshold` around `0.15–0.2`, `once: true` so sections don't
re-animate on scroll-up) that toggles a CSS class, and drive the actual motion with CSS
transitions (`opacity` + `translateY(24px)` → `translateY(0)`, ~500–700ms, a slight stagger
between sibling cards via `transition-delay`). A subtle parallax on the hero background
(translate at a fraction of scroll speed) is a nice-to-have — implement with a scroll listener
throttled via `requestAnimationFrame`, not on every raw scroll event. If richer motion is
wanted later, `framer-motion` is a reasonable addition then — don't add it pre-emptively for
this first pass.

**Images.** No real product screenshots exist yet. Use the Accorix logo/mark (task 2's asset)
in the hero and footer, and represent every feature card with a simple inline SVG icon
(monoline/outline style, consistent stroke width, colored with the CSS-variable palette) rather
than photography or stock images — keeps the page fast and avoids needing licensed assets for a
demo. If real product screenshots become available later, swap them in per-section; don't block
this pass on that.

**Responsiveness.** This page will very likely be shown on a laptop in a client meeting but
should not visibly break on a phone-width viewport either — stack the card grids to one column
and the roadmap timeline to vertical below a reasonable breakpoint (e.g. `768px`), same as any
other responsive work in this repo would be expected to do.

**Verification.** `npm run build` must still pass with zero TS/ESLint errors (per the Commands
section above) after adding the new route, hook, and footer component — this is a hard
requirement for "done," same as every other change in this repo.