---
name: run
description: Launch the Invoice OCR POC (Next.js 14 App Router) locally and verify it's serving without errors. Use whenever asked to run, start, or check this app works.
---

# Running this project

This is a Next.js 14 App Router app (see [CLAUDE.md](../../../CLAUDE.md) and
[design.md](../../../design.md) for architecture). It has no test suite — "working" means
`npm run build` passes and the dev server serves the home page and API routes without crashing.

## Steps

1. **Install deps** (skip if `node_modules` already exists and `package-lock.json` is unchanged):
   ```bash
   npm install
   ```

2. **Ensure env file exists.** The app reads `.env.local` (not `.env.example`) and must not crash
   without it — missing keys should surface as friendly English error JSON from the API routes
   (never a server crash). If `.env.local` is missing, create it from the template so the server
   has something to read:
   ```bash
   cp .env.example .env.local
   ```
   Leave `OPENROUTER_API_KEY` blank unless a real value is available — the app is designed to
   degrade gracefully without it. OCR itself (Tesseract.js) needs no key at all.

3. **Start the dev server.** Default port is 3000; pass `-p <port>` if asked for a specific one
   (e.g. port 8080 has been used in this session before):
   ```bash
   npm run dev            # http://localhost:3000
   npm run dev -- -p 8080 # http://localhost:8080
   ```
   Run it in the background (`run_in_background: true` or `&`) since it's a long-lived server.
   On Windows, if the target port is already in use from a previous session, kill stray Node
   processes first: `taskkill //F //IM node.exe`.

4. **Verify it's actually up**, don't just trust "Ready" in the log:
   ```bash
   curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:<port>/
   ```
   Expect `200`. Optionally also sanity-check the API routes degrade cleanly without keys:
   ```bash
   curl -s -X POST http://localhost:<port>/api/ocr        # expect an English error JSON, not a crash
   curl -s -X POST http://localhost:<port>/api/classify -H "Content-Type: application/json" -d '{}'
   ```
   `/api/ocr` accepts both images and PDFs (each PDF page is rasterized via `pdfjs-dist` +
   `@napi-rs/canvas` before OCR — see CLAUDE.md/design.md). If `OPENROUTER_API_KEY` is actually set
   and you want to exercise the real pipeline, POST a real image/PDF with `-F "file=@some.pdf"` and
   confirm the response is `{"success": true, "data": [...]}` — `data` is always an array now (one
   entry per receipt found, possibly more than one per page). `scripts/test-ocr-sample.mjs
   [baseUrl] [filePath]` wraps this same check with pass/fail output — defaults to
   `http://localhost:3000`, but also accepts a deployed URL as `baseUrl` to exercise a Vercel
   deployment the same way. `GET /ai-test` is a faster first check when only OpenRouter
   connectivity/env-var correctness is in question, since it skips the OCR pipeline entirely.

5. Report the URL the server is listening on. Next.js only reads `.env.local` at process start —
   if env vars were edited after the server was already running, restart it.

## Build check (when asked to verify correctness, not just "run")

```bash
npm run build
```
Must complete with zero TypeScript/ESLint errors. This is the closest thing this repo has to a
test suite — treat a clean build as the bar for "done."

## Troubleshooting: works locally but fails/hangs only on Vercel

Don't assume "it built and ran locally" means it'll work when deployed — this repo has already hit
a bug class where `/api/ocr` worked perfectly in `npm run dev`/`npm start` (which always has the
full `node_modules`) but hung for the full 60s `maxDuration` and died with a raw platform 504 on
every single Vercel deployment, with zero difference in behavior across several unrelated-looking
fix attempts. Root cause: an asset (`tesseract.js-core`'s `.wasm` binary, then
`@tesseract.js-data/eng`'s `eng.traineddata.gz`) was reachable in code only via a runtime-computed
path, not a literal `require()`/`import`, so Vercel's build-time file tracer silently omitted it
from the deployed function — and the dependency's own promise chain had no `.catch()`, so the
missing file didn't error, it just hung forever. If a similar "works locally, hangs or 500s only in
production" report comes in for this repo:

1. Check `.next/server/app/<route>/route.js.nft.json` after a build — grep it for the
   package/file you'd expect the failing code path to touch. If it's missing, that's the bug.
2. The fix is `next.config.js`'s `experimental.outputFileTracingIncludes` — see the existing
   entries there and the matching note in CLAUDE.md's Conventions section for the exact pattern.
3. This can't be reproduced with `npm run dev`/`npm start` locally (full `node_modules` is always
   present) — the only way to confirm a fix is testing against the actual deployed URL, e.g. via
   `node scripts/test-ocr-sample.mjs https://<deployment-url> /path/to/file`.
