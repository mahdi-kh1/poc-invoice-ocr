import { NextRequest, NextResponse } from "next/server";
import { createWorker, type Worker } from "tesseract.js";
import { loadImage, createCanvas } from "@napi-rs/canvas";
import path from "path";
import fs from "fs";
import os from "os";
import { pathToFileURL } from "url";
import type { OcrExtractedData } from "@/lib/types";
import { getModelChain } from "@/lib/models";

// Must be under the OS temp dir, not process.cwd() — on Vercel (and most serverless hosts) the
// deployment bundle is read-only and only /tmp is writable. Writing under cwd instead throws
// EROFS/EACCES at import time (before any request handler runs), which crashes the whole
// function and surfaces to the client as an HTML 500 page instead of a JSON error response.
const TESSERACT_CACHE_PATH = path.join(os.tmpdir(), "poc-invoice-ocr-tesseract-cache");
// tesseract.js's Node cache writer does a plain fs.writeFile with no mkdir, so the
// trained-data cache silently never persists unless this directory already exists.
fs.mkdirSync(TESSERACT_CACHE_PATH, { recursive: true });

// Without an explicit langPath, tesseract.js fetches eng.traineddata.gz from jsDelivr's CDN on
// every cold start, since /tmp (where it would otherwise cache) is wiped between invocations on
// Vercel — a network round-trip of unpredictable latency was eating the whole 60s function budget
// on some cold starts, surfacing as a 504 even for a small image. The @tesseract.js-data/eng
// package ships the exact same file locally, so it's read straight out of the (read-only, but
// readable) deployment bundle instead — no network call at all. "4.0.0_best_int" matches what
// tesseract.js would request by default for the default OEM (LSTM-only trained data).
const LANG_DATA_PATH = path.join(
  process.cwd(),
  "node_modules",
  "@tesseract.js-data",
  "eng",
  "4.0.0_best_int"
);

// Each PDF page triggers its own OCR pass + LLM extraction call, so this caps request
// cost/latency for this proof-of-concept rather than reflecting a hard technical limit.
const MAX_PDF_PAGES = 15;

// The free OpenRouter model's response time is highly variable in practice — measured anywhere
// from ~2s to ~48s for the exact same prompt back to back. Vercel kills the whole function with a
// bare HTML 504 if maxDuration is exceeded, bypassing our JSON error handling entirely, so this
// call is aborted well before that ceiling — a slow model response becomes a normal, friendly
// JSON error instead of an opaque platform-level timeout. This used to be 25s, which — despite the
// ~48s figure right above it — was cutting off a real share of responses that would otherwise have
// succeeded: OCR itself is fast in practice (worker startup + both Tesseract passes typically
// finish in ~1-2s), so by the time this call starts there's usually ~48s of REQUEST_DEADLINE_MS
// still unused, but the old 25s ceiling threw that slack away regardless. Raised to use most of
// what's actually available; `Math.min(OPENROUTER_TIMEOUT_MS, deadline - Date.now())` at the call
// site still naturally shrinks this when OCR genuinely did eat into the budget.
const OPENROUTER_TIMEOUT_MS = 42_000;

// Tesseract itself has no built-in timeout — a large/noisy image can make `recognize()` run far
// longer than expected, especially on Vercel's weaker/shared CPU vs. a local dev machine. Racing
// it against a timeout turns a stuck OCR pass into the same friendly JSON error as every other
// failure mode here, instead of silently eating the whole request budget. This is a ceiling on a
// *single* OCR pass — recognizeText() below can run up to two passes (see its doc comment), so
// this is kept well under REQUEST_DEADLINE_MS to leave room for both plus the LLM call.
const OCR_TIMEOUT_MS = 18_000;

// Reserved for the field-extraction LLM call so a slow/weak-confidence OCR pass can never eat the
// entire request budget and leave nothing for it — see the canAffordSecondPass check below.
const LLM_MIN_MS = 8_000;

// Floor per model attempt inside extractReceiptsWithFallback's even split (see its doc comment) —
// lower than LLM_MIN_MS since this bounds one of potentially several attempts sharing the same
// LLM_MIN_MS-sized window, not the only one.
const MODEL_ATTEMPT_MIN_MS = 6_000;

// Ceiling on createWorker() itself (spawning the worker thread, loading the core WASM engine and
// language data) — see the comment at its call site for why this matters.
const WORKER_STARTUP_TIMEOUT_MS = 20_000;

// Optional third OCR source (see recognizeText) — a vision-capable model reading the image
// directly, opt-in via the `useVisionAssist` form field. Off by default: it's an extra OpenRouter
// round-trip on top of the field-extraction call, adding latency and free-tier rate-limit
// pressure. Override with OPENROUTER_VISION_MODEL if this one stops being free — always check
// https://openrouter.ai/models?max_price=0 (filter for vision/image input) before relying on it.
const DEFAULT_VISION_MODEL = "nvidia/nemotron-nano-12b-v2-vl:free";
// Same reasoning as OPENROUTER_TIMEOUT_MS above — the vision call starts concurrently with the
// Tesseract passes (see recognizeText), so raising its ceiling doesn't cost anything extra when
// there's slack; visionBudget's own `deadline - Date.now() - LLM_MIN_MS` still caps it correctly
// when there isn't.
const VISION_TIMEOUT_MS = 42_000;

// Single-page budget leaves ~10s of the 60s maxDuration for worker startup, PDF rasterization,
// downscaling, and network overhead — enough for one page/image to always fail as JSON instead of
// a raw platform 504 before ever hitting the hard kill. A multi-page PDF can still exceed the
// *total* budget across several pages; the REQUEST_DEADLINE_MS check between pages below stops
// early and returns whatever pages already succeeded instead of losing everything to the hard kill.
const REQUEST_DEADLINE_MS = 50_000;

export const runtime = "nodejs";
// Tesseract + PDF rasterization + the OpenRouter round-trip can comfortably exceed Vercel's
// default 10s function timeout, especially on a cold start (re-downloading trained-data into
// /tmp, which doesn't persist across invocations there). 60s is the max selectable on Hobby.
export const maxDuration = 60;

function toStringOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length > 0 && s.toLowerCase() !== "null" ? s : null;
}

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function buildExtractedData(
  fields: Record<string, unknown>,
  rawText: string,
  pageNumber: number | null
): OcrExtractedData {
  return {
    vendorName: toStringOrNull(fields.vendorName),
    invoiceNumber: toStringOrNull(fields.invoiceNumber),
    invoiceDate: toStringOrNull(fields.invoiceDate),
    totalAmount: toNumberOrNull(fields.totalAmount),
    currency: toStringOrNull(fields.currency),
    vatAmount: toNumberOrNull(fields.vatAmount),
    transactionType: toStringOrNull(fields.transactionType),
    description: toStringOrNull(fields.description),
    debitAmount: toNumberOrNull(fields.debitAmount),
    creditAmount: toNumberOrNull(fields.creditAmount),
    balance: toNumberOrNull(fields.balance),
    accountName: toStringOrNull(fields.accountName),
    accountNumber: toStringOrNull(fields.accountNumber),
    sortCode: toStringOrNull(fields.sortCode),
    vatNumber: toStringOrNull(fields.vatNumber),
    merchantAddress: toStringOrNull(fields.merchantAddress),
    paymentMethod: toStringOrNull(fields.paymentMethod),
    subtotal: toNumberOrNull(fields.subtotal),
    receiptTime: toStringOrNull(fields.receiptTime),
    rawText: rawText.slice(0, 4000), // raised from 2000 so a combined two-pass preview isn't cut off mid-Pass-A
    pageNumber,
  };
}

/**
 * Renders every page of a PDF to a PNG buffer so Tesseract (which only reads images) can OCR it.
 * pdfjs-dist auto-selects a Node canvas factory backed by @napi-rs/canvas when running server-side.
 */
async function renderPdfToPageImages(buffer: Buffer): Promise<Buffer[]> {
  // Literal specifier (not a computed path) so Next can leave this import external instead of
  // trying to bundle it — see the `serverComponentsExternalPackages` note in next.config.js.
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const doc = await pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    standardFontDataUrl: pathToFileURL(
      path.join(process.cwd(), "node_modules", "pdfjs-dist", "standard_fonts") + "/"
    ).href,
    cMapUrl: pathToFileURL(path.join(process.cwd(), "node_modules", "pdfjs-dist", "cmaps") + "/").href,
    cMapPacked: true,
  }).promise;

  if (doc.numPages > MAX_PDF_PAGES) {
    throw new Error(
      `This PDF has ${doc.numPages} pages — only PDFs up to ${MAX_PDF_PAGES} pages are supported in this proof-of-concept. Please split the file and re-upload.`
    );
  }

  // pdfjs-dist's .mjs entry point has no bundled type declarations for this subpath, so the
  // Node canvas factory it auto-selects (backed by @napi-rs/canvas) comes back untyped.
  const canvasFactory: {
    create(width: number, height: number): { canvas: any; context: any };
    destroy(canvasAndContext: { canvas: any; context: any }): void;
  } = (doc as any).canvasFactory;

  const images: Buffer[] = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvasAndContext = canvasFactory.create(viewport.width, viewport.height);
    // `canvas: null` is required by the type signature but pdfjs falls back to the canvas
    // tied to `canvasContext` (from our Node canvas factory) when it's not supplied.
    await page.render({ canvasContext: canvasAndContext.context, canvas: null, viewport }).promise;
    images.push(canvasAndContext.canvas.toBuffer("image/png"));
    canvasFactory.destroy(canvasAndContext);
  }
  return images;
}

/**
 * Extracts structured fields for every receipt/invoice/statement line found in one OCR'd
 * page/image — plural, because a single scan commonly contains more than one receipt.
 */
async function extractReceipts(
  rawText: string,
  apiKey: string,
  model: string,
  timeoutMs: number
): Promise<Record<string, unknown>[]> {
  const prompt = `You are a document data-extraction assistant. The text below was extracted via OCR from a single scanned page or photo, which may contain financial documents — invoices, UK retail receipts, or bank-statement lines (it may contain OCR noise/typos). It is common for MULTIPLE separate receipts/invoices to be scanned or photographed together on one page — identify each distinct document separately, do not merge their fields together.

The OCR text may be split into multiple labeled passes ("OCR PASS A", "OCR PASS B", and sometimes "OCR PASS C") of the SAME document, produced by different methods — this is not multiple different documents. Passes A and B are traditional OCR with different image preprocessing; pass C, when present, is a vision-capable AI model's direct reading of the image, which can better understand layout/context but can also occasionally paraphrase or restructure rather than transcribe verbatim. Each pass fails in different, uncorrelated ways (one may lose a faint total, another may misread a smudged line), so cross-reference every pass present for every field: if a field is only clear in one pass, use that reading; if passes show the same value with minor noise (e.g. "GBP7.98" vs "GBP 7,98"), reconcile to the clearest form; if passes genuinely disagree, prefer whichever reading looks more plausible for that field's type (e.g. a well-formed date or amount over garbled text). Never treat separate passes as separate documents.

Respond with ONLY a raw JSON ARRAY, no markdown fences, no explanation — one object per distinct document found, each shaped exactly like this:

{"vendorName": string|null, "invoiceNumber": string|null, "invoiceDate": string|null, "totalAmount": number|null, "currency": string|null, "vatAmount": number|null, "transactionType": string|null, "description": string|null, "debitAmount": number|null, "creditAmount": number|null, "balance": number|null, "accountName": string|null, "accountNumber": string|null, "sortCode": string|null, "vatNumber": string|null, "merchantAddress": string|null, "paymentMethod": string|null, "subtotal": number|null, "receiptTime": string|null}

If the page only contains a single document, return an array with exactly one object.

Field notes:
- vendorName/invoiceNumber/invoiceDate/totalAmount/vatAmount: standard invoice fields, if present.
- transactionType: short code/label if this looks like a bank transaction (e.g. "FPI", "DD", "TFR"), else null.
- description: the raw transaction/line-item description text, if present.
- debitAmount/creditAmount/balance: bank-statement amounts, if present.
- accountName/accountNumber/sortCode: bank account identifiers, if present.
- vatNumber: UK VAT registration number (e.g. "GB123456789"), if printed on the receipt.
- merchantAddress: the store/merchant's postal address, if present.
- paymentMethod: how the purchase was paid (e.g. "Card", "Cash", "Contactless"), if stated.
- subtotal: the net amount before VAT is added, if shown separately from totalAmount.
- receiptTime: the time of purchase (e.g. "14:32"), if printed separately from the date.

Rules:
- Never merge fields from two different documents into one object — split them into separate array entries instead.
- All amount fields must be plain numbers with no currency symbols, commas, or spaces, or null if not found.
- currency should be an ISO code (e.g. "GBP", "USD") if identifiable, else the symbol/word as written, else null.
- Never guess — use null for anything not clearly present in the text.

OCR TEXT:
"""
${rawText.slice(0, 10000) /* raised from 6000 — combined two-pass text runs roughly 2x a single pass */}
"""`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // AbortController alone only guarantees `fetch()` itself gets interrupted — it does NOT bound
  // `res.json()` afterward, and that gap let a near-identical call (visionTranscribe) hang
  // indefinitely with a slow/stalled response despite its "timeout" supposedly firing. Wrapping
  // the whole fetch+parse flow in Promise.race guarantees this always returns or throws by
  // timeoutMs regardless of what's actually slow inside it — see visionTranscribe's comment.
  // The whole body is one try/catch, not just the fetch() call — the abort signal can also
  // interrupt an in-flight res.json() body read (fetch() resolving only means headers arrived),
  // and an AbortError from there is just as unhelpful raw ("This operation was aborted") as one
  // from fetch() itself if it isn't caught and reworded here too.
  const run = async (): Promise<Record<string, unknown>[]> => {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
          // Without this, the provider's own default completion budget applies — and for a
          // reasoning model like gpt-oss-20b, internal reasoning tokens are drawn from that same
          // budget before any output text is produced. That left too little room for the actual
          // JSON on pages with several line items or multiple receipts, cutting the response off
          // mid-object (e.g. stopping mid-string on a field like "balance") and failing JSON.parse
          // below. 4096 comfortably covers the ~19-field schema repeated across several documents.
          max_tokens: 4096,
        }),
        signal: controller.signal,
        cache: "no-store",
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(
          `OpenRouter error during field extraction (${res.status}): ${errText}. If the selected model is no longer free, change OPENROUTER_MODEL in .env.local — current free list: openrouter.ai/models?max_price=0`
        );
      }

      const json = await res.json();
      const choice = json.choices?.[0];
      const content: string = choice?.message?.content ?? "";

      // json.choices?.[0]?.message?.content ?? "" silently becomes "" whenever the API response
      // has no usable content — not just malformed JSON. This happens for real: a free model can
      // return a genuinely empty completion (moderation refusal, degenerate output under load,
      // hitting its own internal error) with an HTTP 200 and no other signal. Checking for this
      // *before* attempting JSON.parse means the error message actually explains what happened
      // instead of the unhelpful "invalid JSON: " (nothing after the colon) an empty string
      // produces from the generic parse-failure branch below.
      if (!content.trim()) {
        const reason = choice?.finish_reason || choice?.message?.refusal || "no reason given by the model";
        throw new Error(
          `The AI model (${model}) returned an empty response (${reason}). This can happen when a free model is overloaded or briefly misbehaves — try again in a moment, or switch OPENROUTER_MODEL in .env.local to a different free model: openrouter.ai/models?max_price=0`
        );
      }

      const cleaned = content.replace(/```json|```/g, "").trim();
      let parsed: unknown;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        // finish_reason "length" means the model hit max_tokens before finishing — the JSON is
        // genuinely incomplete (cut off mid-object/mid-string), not malformed by the model itself.
        // That's a distinct, actionable failure from any other parse error, so it gets its own
        // message instead of the generic one below dumping a truncated JSON fragment at the user.
        if (choice?.finish_reason === "length") {
          throw new Error(
            `The AI model (${model}) ran out of output space before finishing its response, so the JSON was cut off mid-document. This tends to happen on pages with many line items or several receipts at once. Try again, or switch OPENROUTER_MODEL in .env.local to a model with a larger output limit: openrouter.ai/models?max_price=0`
          );
        }
        throw new Error(`Model response could not be parsed (invalid JSON): ${content.slice(0, 300)}`);
      }
      const list = Array.isArray(parsed) ? parsed : [parsed];
      return list.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new Error(
          `The AI model (${model}) took longer than ${Math.round(timeoutMs / 1000)}s to respond — free OpenRouter models can be slow or overloaded. Try again in a moment, or switch OPENROUTER_MODEL in .env.local to a different free model: openrouter.ai/models?max_price=0`
        );
      }
      throw err;
    }
  };

  try {
    return await Promise.race([
      run(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                `The AI model (${model}) took longer than ${Math.round(timeoutMs / 1000)}s to respond — free OpenRouter models can be slow or overloaded. Try again in a moment, or switch OPENROUTER_MODEL in .env.local to a different free model: openrouter.ai/models?max_price=0`
              )
            ),
          timeoutMs
        )
      ),
    ]);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Tries extractReceipts against each model in modelChain in turn, stopping at the first one that
 * succeeds. A free model being rate-limited or overloaded is a routine failure mode (observed
 * directly: a 429 "temporarily rate-limited upstream" from the default model) rather than a rare
 * edge case, so giving up after a single model wastes an OCR pass whose text was already fine.
 *
 * Each attempt's timeout is the remaining budget split evenly across the models not yet tried,
 * not the full OPENROUTER_TIMEOUT_MS ceiling — letting the first attempt claim nearly the whole
 * deadline (as a flat per-attempt ceiling would) leaves no time for any fallback at all when that
 * first model is merely slow rather than failing fast, which defeats the point of having a chain.
 * Stops early once even a fair share can't clear MODEL_ATTEMPT_MIN_MS, and surfaces one
 * aggregated friendly error only if every attempted model failed.
 */
async function extractReceiptsWithFallback(
  rawText: string,
  apiKey: string,
  modelChain: string[],
  deadline: number
): Promise<Record<string, unknown>[]> {
  let lastError: Error | null = null;
  for (let i = 0; i < modelChain.length; i++) {
    const remaining = deadline - Date.now();
    if (remaining < MODEL_ATTEMPT_MIN_MS) break;
    const modelsLeft = modelChain.length - i;
    const timeoutMs = Math.max(
      MODEL_ATTEMPT_MIN_MS,
      Math.min(OPENROUTER_TIMEOUT_MS, Math.floor(remaining / modelsLeft))
    );
    try {
      return await extractReceipts(rawText, apiKey, modelChain[i], timeoutMs);
    } catch (err: any) {
      lastError = err;
    }
  }
  throw new Error(
    `All free AI models are currently rate-limited or unavailable — you've hit today's free-tier usage across every fallback model (last error: ${lastError?.message || "unknown"}). Try again in a few minutes, or add your own OpenRouter API key for higher limits: https://openrouter.ai/keys`
  );
}

// Full-resolution photos/screenshots (easily 3000px+ on a side) make Tesseract dramatically
// slower without improving accuracy — printed text is legible to OCR well below this cap. This
// also protects against Vercel's function timeout, which not even `maxDuration = 60` can raise
// past on Hobby, and a slow/underpowered function is exactly what turned into a 504 there.
const MAX_OCR_DIMENSION = 2000;

// The inverse problem: a small photo or screenshot (e.g. ~500x700) can have text whose stroke
// width is only a couple of pixels, which Tesseract reads unreliably — this was directly observed
// on a real invoice where small tabular text at native resolution came back with several fields
// null. Upscaling before OCR (not after — more pixels for Tesseract to resolve strokes against)
// measurably helps in practice, at the cost of somewhat slower recognition.
const MIN_OCR_DIMENSION = 1600;

async function resizeForOcr(buffer: Buffer): Promise<Buffer> {
  const img = await loadImage(buffer);
  const longestSide = Math.max(img.width, img.height);
  let scale = 1;
  if (longestSide > MAX_OCR_DIMENSION) scale = MAX_OCR_DIMENSION / longestSide;
  else if (longestSide < MIN_OCR_DIMENSION) scale = MIN_OCR_DIMENSION / longestSide;
  if (scale === 1) return buffer;

  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toBuffer("image/png");
}

// --- Preprocessing --------------------------------------------------------
// Classic OCR preprocessing: flatten to grayscale, stretch contrast to use the full 0-255 range
// (photos of receipts are commonly washed out or shadowed), then binarize with an Otsu threshold
// so faint thermal-paper print becomes solid black on solid white. This is the single biggest
// lever for Tesseract accuracy on phone-photographed receipts, well beyond what resizing alone
// achieves.

function toGrayscale(data: Uint8ClampedArray): { min: number; max: number } {
  let min = 255;
  let max = 0;
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    data[i] = data[i + 1] = data[i + 2] = gray;
    if (gray < min) min = gray;
    if (gray > max) max = gray;
  }
  return { min, max };
}

function stretchContrast(data: Uint8ClampedArray, min: number, max: number) {
  if (max <= min) return;
  const range = max - min;
  for (let i = 0; i < data.length; i += 4) {
    const v = Math.round(((data[i] - min) / range) * 255);
    const clamped = v < 0 ? 0 : v > 255 ? 255 : v;
    data[i] = data[i + 1] = data[i + 2] = clamped;
  }
}

/** Otsu's method — picks the luminance threshold that best separates two peaks (text vs. background). */
function otsuThreshold(data: Uint8ClampedArray): number {
  const histogram = new Array(256).fill(0);
  for (let i = 0; i < data.length; i += 4) histogram[data[i]]++;
  const total = data.length / 4;

  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * histogram[t];

  let sumB = 0;
  let weightB = 0;
  let maxVariance = 0;
  let threshold = 127;
  for (let t = 0; t < 256; t++) {
    weightB += histogram[t];
    if (weightB === 0) continue;
    const weightF = total - weightB;
    if (weightF === 0) break;
    sumB += t * histogram[t];
    const meanB = sumB / weightB;
    const meanF = (sum - sumB) / weightF;
    const variance = weightB * weightF * (meanB - meanF) ** 2;
    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }
  return threshold;
}

function binarize(data: Uint8ClampedArray, threshold: number) {
  for (let i = 0; i < data.length; i += 4) {
    const v = data[i] >= threshold ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = v;
  }
}

/** Grayscale + contrast stretch, optionally followed by Otsu binarization. */
async function preprocessForOcr(buffer: Buffer, binarizeImage: boolean): Promise<Buffer> {
  const img = await loadImage(buffer);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, img.width, img.height);
  const { min, max } = toGrayscale(imageData.data);
  stretchContrast(imageData.data, min, max);
  if (binarizeImage) {
    binarize(imageData.data, otsuThreshold(imageData.data));
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toBuffer("image/png");
}

async function raceOcr(
  worker: Worker,
  image: Buffer,
  timeoutMs: number
): Promise<{ text: string; confidence: number }> {
  const { data } = await Promise.race([
    worker.recognize(image),
    new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              `OCR took longer than ${Math.round(timeoutMs / 1000)}s on this image/page — try a smaller or clearer image.`
            )
          ),
        timeoutMs
      )
    ),
  ]);
  return { text: data.text || "", confidence: data.confidence ?? 0 };
}

/**
 * Sends the image directly to a vision-capable OpenRouter model and asks it to transcribe visible
 * text verbatim. Deliberately kept as a text-transcription task (not a separate structured-field
 * extraction call) so its output can be combined with the two Tesseract passes using the exact
 * same cross-referencing prompt in extractReceipts, instead of needing a whole parallel
 * field-merging codepath — see the "OCR PASS C" handling in that prompt.
 */
async function visionTranscribe(
  imageBuffer: Buffer,
  apiKey: string,
  model: string,
  timeoutMs: number
): Promise<string> {
  const base64 = imageBuffer.toString("base64");
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // AbortController alone only guarantees the *fetch()* call itself gets interrupted — it does
  // NOT bound `res.json()` afterward, and in practice that gap let a slow/stalled response hang
  // this call indefinitely with no timeout at all (observed directly: a vision request sat past
  // its supposed timeout with zero progress). Wrapping the whole fetch+parse flow in Promise.race
  // — the same defensive pattern raceOcr() uses for Tesseract — guarantees this function always
  // returns or throws by timeoutMs, regardless of what's actually slow inside it.
  // The whole body is one try/catch, not just the fetch() call — the abort signal can also
  // interrupt an in-flight res.json() body read (fetch() resolving only means headers arrived),
  // and an AbortError from there is just as unhelpful raw ("This operation was aborted") as one
  // from fetch() itself if it isn't caught and reworded here too.
  const run = async (): Promise<string> => {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Transcribe every piece of visible text in this image verbatim, top to bottom, preserving line breaks. This is a scanned invoice, receipt, or bank statement — include all numbers, dates, and labels exactly as printed. Do not summarize, explain, or add commentary — output only the transcribed text.",
                },
                { type: "image_url", image_url: { url: `data:image/png;base64,${base64}` } },
              ],
            },
          ],
          temperature: 0.1,
          // Same reasoning-budget issue as extractReceipts's max_tokens — a dense receipt/statement
          // image can produce a long verbatim transcription, and without this the provider default
          // could truncate it before the field-extraction call ever sees the missing lines.
          max_tokens: 2048,
        }),
        signal: controller.signal,
        cache: "no-store",
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenRouter vision error (${res.status}): ${errText}`);
      }

      const json = await res.json();
      return json.choices?.[0]?.message?.content ?? "";
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new Error(`Vision model (${model}) took longer than ${Math.round(timeoutMs / 1000)}s to respond`);
      }
      throw err;
    }
  };

  try {
    return await Promise.race([
      run(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Vision model (${model}) took longer than ${Math.round(timeoutMs / 1000)}s to respond`)),
          timeoutMs
        )
      ),
    ]);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Runs OCR against both the binarized (enhanced) and plain grayscale variants of the image
 * whenever there's time for both, plus an optional third pass from a vision-capable model reading
 * the image directly (`vision`, opt-in) — and returns every pass's raw text labeled rather than
 * picking a single "winner" by confidence. Each method fails in different, uncorrelated ways — one
 * might catch a faint total another crushed to white or misread as noise — so instead of
 * discarding whichever text merely *looks* worse, all of them are handed to the field-extraction
 * LLM to cross-reference, which can combine multiple sources far better than picking one blindly.
 *
 * The vision call (when enabled) is started immediately, before the Tesseract passes, and only
 * awaited at the end — its network latency then overlaps with Tesseract's CPU-bound worker_thread
 * computation instead of stacking on top of it sequentially, which is what makes a third source
 * affordable within the same per-page time budget.
 */
async function recognizeText(
  worker: Worker,
  imageBuffer: Buffer,
  deadline: number,
  vision: { apiKey: string; model: string } | null
): Promise<string> {
  const ocrReadyImage = await resizeForOcr(imageBuffer);

  // Reserve LLM_MIN_MS same as every other timeout here, and skip entirely if there isn't a
  // reasonable window left — no point starting a request that's about to be starved anyway.
  const visionBudget = deadline - Date.now() - LLM_MIN_MS;
  const visionPromise =
    vision && visionBudget > 8_000
      ? visionTranscribe(ocrReadyImage, vision.apiKey, vision.model, Math.min(VISION_TIMEOUT_MS, visionBudget)).catch(
          () => ""
        )
      : null;

  const enhanced = await preprocessForOcr(ocrReadyImage, true);
  const primaryTimeout = Math.min(OCR_TIMEOUT_MS, Math.max(5_000, deadline - Date.now()));
  const primary = await raceOcr(worker, enhanced, primaryTimeout);

  const passes: { label: string; text: string }[] = [
    { label: "OCR PASS A (contrast-enhanced + binarized)", text: primary.text },
  ];

  const remaining = deadline - Date.now();
  // Guarantees that even if the second pass runs its full timeout, LLM_MIN_MS is still left over
  // for the field-extraction call afterward — see LLM_MIN_MS's doc comment. This is the only
  // reason a second pass is ever skipped — not primary pass confidence.
  const canAffordSecondPass = remaining > OCR_TIMEOUT_MS + LLM_MIN_MS;
  if (canAffordSecondPass) {
    try {
      const plain = await preprocessForOcr(ocrReadyImage, false);
      const secondaryTimeout = Math.min(OCR_TIMEOUT_MS, remaining - LLM_MIN_MS);
      const secondary = await raceOcr(worker, plain, secondaryTimeout);
      if (secondary.text.trim() && secondary.text.trim() !== primary.text.trim()) {
        passes.push({ label: "OCR PASS B (plain grayscale)", text: secondary.text });
      }
    } catch {
      // Second pass failed/timed out — passes already collected are still usable, so fall back to
      // those rather than fail the whole page over a best-effort quality improvement.
    }
  }

  if (visionPromise) {
    const visionText = await visionPromise;
    if (visionText.trim()) {
      passes.push({ label: "OCR PASS C (AI vision model reading)", text: visionText });
    }
  }

  if (passes.length === 1) return passes[0].text;
  return passes.map((p) => `--- ${p.label} ---\n${p.text}`).join("\n\n");
}

export async function POST(req: NextRequest) {
  // Started here, not after worker creation — request parsing, PDF rasterization, and Tesseract
  // worker startup (reading trained data + WASM init) can themselves be slow on a cold Vercel
  // instance, and none of that time is optional or skippable. Starting the clock later left a gap
  // where those steps ate into the 60s maxDuration without counting against our own budget, so the
  // total could still exceed it and hit Vercel's hard kill (raw HTML 504) despite every downstream
  // timeout looking individually safe.
  const deadline = Date.now() + REQUEST_DEADLINE_MS;
  try {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json(
        { error: "Request must be multipart/form-data with a file field" },
        { status: 400 }
      );
    }
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file was uploaded" }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    const modelChain = getModelChain();
    const visionModel = process.env.OPENROUTER_VISION_MODEL || DEFAULT_VISION_MODEL;
    // Form fields always arrive as strings — "true"/"false", not a real boolean.
    const useVisionAssist = formData.get("useVisionAssist") === "true";

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY is not set in .env.local" },
        { status: 500 }
      );
    }

    const isPdf = file.type === "application/pdf" || file.name?.toLowerCase().endsWith(".pdf");
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let pageImages: { image: Buffer; pageNumber: number | null }[];
    if (isPdf) {
      try {
        const images = await renderPdfToPageImages(buffer);
        pageImages = images.map((image, i) => ({ image, pageNumber: i + 1 }));
      } catch (err: any) {
        return NextResponse.json(
          { error: err.message || "Could not read this PDF — it may be corrupted or password-protected" },
          { status: 400 }
        );
      }
    } else {
      pageImages = [{ image: buffer, pageNumber: null }];
    }

    // tesseract.js's own createWorker() has no internal timeout anywhere — if its setup chain
    // (spawning the worker thread, loading the core WASM engine, loading language data) hangs
    // instead of erroring, `await createWorker(...)` would hang forever and none of the deadline
    // logic below would ever run, no matter how it's tuned. Race it explicitly so a stuck startup
    // becomes the same friendly JSON error as every other failure mode here.
    let worker: Worker;
    let lastStartupStatus = "not started";
    try {
      worker = await Promise.race([
        createWorker(["eng"], undefined, {
          cachePath: TESSERACT_CACHE_PATH,
          langPath: LANG_DATA_PATH,
          logger: (m: { status?: string; progress?: number }) => {
            lastStartupStatus = `${m.status ?? "?"} (${Math.round((m.progress ?? 0) * 100)}%)`;
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  `The OCR engine failed to start in time (stuck at: ${lastStartupStatus}) — please try again in a moment.`
                )
              ),
            WORKER_STARTUP_TIMEOUT_MS
          )
        ),
      ]);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }

    // Parsing/rasterization/worker-startup alone already used up the safety margin — bail out now
    // with a friendly error instead of starting OCR work we don't have room to finish before
    // Vercel's hard kill.
    if (deadline - Date.now() < OCR_TIMEOUT_MS + LLM_MIN_MS) {
      // Not awaited — see the finally block below for why.
      worker.terminate().catch(() => {});
      return NextResponse.json(
        {
          error:
            "The server is warming up (cold start) and ran out of time to process this file — please try again in a few seconds.",
        },
        { status: 503 }
      );
    }

    const results: OcrExtractedData[] = [];
    try {
      for (const { image, pageNumber } of pageImages) {
        // Only relevant for multi-page PDFs — a single image/page always gets its full budget.
        // Once time is tight, stop and return whatever pages already succeeded rather than risk
        // Vercel's hard maxDuration kill discarding all of them as a raw 504.
        if (results.length > 0 && deadline - Date.now() < OCR_TIMEOUT_MS + LLM_MIN_MS) break;

        const rawText = await recognizeText(
          worker,
          image,
          deadline,
          useVisionAssist ? { apiKey, model: visionModel } : null
        );
        if (!rawText.trim()) continue;
        const receipts = await extractReceiptsWithFallback(rawText, apiKey, modelChain, deadline);
        for (const fields of receipts) {
          results.push(buildExtractedData(fields, rawText, pageNumber));
        }
      }
    } finally {
      // Not awaited: if a timed-out OCR pass left the worker mid-computation inside synchronous
      // WASM, terminate() can itself block until that computation yields — awaiting it here would
      // silently re-introduce the exact delay the timeouts above exist to cap. Vercel tears down
      // the whole sandbox after the response anyway, so cleanup doesn't need to finish first.
      worker.terminate().catch(() => {});
    }

    if (results.length === 0) {
      return NextResponse.json(
        {
          error: isPdf
            ? "Tesseract couldn't extract any text from this PDF's pages — check the scan quality/clarity"
            : "Tesseract couldn't extract any text from the image — check the image quality/clarity",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: results });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || `Unexpected error: ${err}` },
      { status: 500 }
    );
  }
}
