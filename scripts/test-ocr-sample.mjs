#!/usr/bin/env node
// Smoke test for POST /api/ocr against a real sample file. This repo has no test suite (see
// CLAUDE.md) — this is a repeatable stand-in for the manual curl steps in .claude/skills/run, kept
// as a script instead of a framework test so it needs nothing beyond a running dev/prod server.
//
// Usage:
//   node scripts/test-ocr-sample.mjs [baseUrl] [filePath]
//
// Defaults to http://localhost:3000 and a sample file at the repo root (see DEFAULT_SAMPLE below)
// — that file is intentionally NOT checked into git (real invoices tend to carry real bank
// details), so pass an explicit filePath if you don't have one sitting there locally. Requires
// `npm run dev` (or `npm run start`) already running in another terminal.

import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");

const DEFAULT_SAMPLE = "Screenshot 2026-08-02 230909.png";

const baseUrl = process.argv[2] || "http://localhost:3000";
const filePath = process.argv[3] || path.join(repoRoot, DEFAULT_SAMPLE);

async function parseResponse(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `Non-JSON response (HTTP ${res.status}). First 500 chars:\n${text.slice(0, 500)}`
    );
  }
}

async function main() {
  console.log(`POST ${baseUrl}/api/ocr`);
  console.log(`file: ${filePath}`);

  const buffer = await readFile(filePath).catch((err) => {
    if (err.code === "ENOENT" && filePath.endsWith(DEFAULT_SAMPLE)) {
      throw new Error(
        `No sample file at ${filePath} — that file isn't checked into git. Pass your own: ` +
          `node scripts/test-ocr-sample.mjs ${baseUrl} /path/to/invoice.png`
      );
    }
    throw err;
  });
  const blob = new Blob([buffer], { type: "image/png" });
  const form = new FormData();
  form.append("file", blob, path.basename(filePath));

  const start = Date.now();
  const res = await fetch(`${baseUrl}/api/ocr`, { method: "POST", body: form });
  const elapsedMs = Date.now() - start;
  const json = await parseResponse(res);

  console.log(`status: ${res.status} (${elapsedMs}ms)`);

  if (!res.ok || !json.success) {
    throw new Error(`OCR failed: ${json.error || JSON.stringify(json)}`);
  }
  if (!Array.isArray(json.data) || json.data.length === 0) {
    throw new Error(`Expected a non-empty data array, got: ${JSON.stringify(json)}`);
  }

  console.log(`extracted ${json.data.length} receipt(s):`);
  for (const [i, receipt] of json.data.entries()) {
    console.log(`  [${i}] vendor=${receipt.vendorName ?? "—"}`);
    console.log(`      invoiceNumber=${receipt.invoiceNumber ?? "—"}`);
    console.log(`      invoiceDate=${receipt.invoiceDate ?? "—"}`);
    console.log(`      totalAmount=${receipt.totalAmount ?? "—"} ${receipt.currency ?? ""}`);
    console.log(`      pageNumber=${receipt.pageNumber ?? "—"}`);
  }

  console.log("PASS: no error, at least one receipt extracted.");
}

main().catch((err) => {
  console.error("FAIL:", err.message);
  process.exit(1);
});
