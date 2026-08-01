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
   without it — missing keys should surface as friendly Persian errors in the UI/API responses,
   not as a server crash. If `.env.local` is missing, create it from the template so the server
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
   curl -s -X POST http://localhost:<port>/api/ocr        # expect a Persian error JSON, not a crash
   curl -s -X POST http://localhost:<port>/api/classify -H "Content-Type: application/json" -d '{}'
   ```

5. Report the URL the server is listening on. Next.js only reads `.env.local` at process start —
   if env vars were edited after the server was already running, restart it.

## Build check (when asked to verify correctness, not just "run")

```bash
npm run build
```
Must complete with zero TypeScript/ESLint errors. This is the closest thing this repo has to a
test suite — treat a clean build as the bar for "done."
