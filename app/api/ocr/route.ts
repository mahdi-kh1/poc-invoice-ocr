import { NextRequest, NextResponse } from "next/server";
import { createWorker, type Worker } from "tesseract.js";
import { loadImage, createCanvas } from "@napi-rs/canvas";
import path from "path";
import fs from "fs";
import os from "os";
import { pathToFileURL } from "url";
import type { OcrExtractedData } from "@/lib/types";

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
// JSON error instead of an opaque platform-level timeout.
const OPENROUTER_TIMEOUT_MS = 25_000;

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

// Ceiling on createWorker() itself (spawning the worker thread, loading the core WASM engine and
// language data) — see the comment at its call site for why this matters.
const WORKER_STARTUP_TIMEOUT_MS = 20_000;

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
    rawText: rawText.slice(0, 2000),
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
${rawText.slice(0, 6000)}
"""`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      }),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error(
        `The AI model (${model}) took longer than ${Math.round(timeoutMs / 1000)}s to respond — free OpenRouter models can be slow or overloaded. Try again in a moment, or switch OPENROUTER_MODEL in .env.local to a different free model: openrouter.ai/models?max_price=0`
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `OpenRouter error during field extraction (${res.status}): ${errText}. If the selected model is no longer free, change OPENROUTER_MODEL in .env.local — current free list: openrouter.ai/models?max_price=0`
    );
  }

  const json = await res.json();
  const content: string = json.choices?.[0]?.message?.content ?? "";
  const cleaned = content.replace(/```json|```/g, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Model response could not be parsed (invalid JSON): ${content.slice(0, 300)}`);
  }
  const list = Array.isArray(parsed) ? parsed : [parsed];
  return list.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
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
 * Runs OCR against the binarized (enhanced) variant first — the best default for typical printed
 * receipts/invoices. Binarization can occasionally lose faint print or colored ink that a plain
 * grayscale pass would have caught, so when the primary pass comes back low-confidence or
 * suspiciously short, a second pass runs against the plain grayscale variant and the better of
 * the two (by Tesseract's own mean confidence) wins — but only if there's still time left in the
 * request's overall deadline, since a second full OCR pass isn't free.
 */
async function recognizeText(worker: Worker, imageBuffer: Buffer, deadline: number): Promise<string> {
  const ocrReadyImage = await resizeForOcr(imageBuffer);

  const enhanced = await preprocessForOcr(ocrReadyImage, true);
  const primaryTimeout = Math.min(OCR_TIMEOUT_MS, Math.max(5_000, deadline - Date.now()));
  const primary = await raceOcr(worker, enhanced, primaryTimeout);

  const looksWeak = primary.confidence < 65 || primary.text.trim().length < 20;
  const remaining = deadline - Date.now();
  // Guarantees that even if the second pass runs its full timeout, LLM_MIN_MS is still left over
  // for the field-extraction call afterward — see LLM_MIN_MS's doc comment.
  const canAffordSecondPass = remaining > OCR_TIMEOUT_MS + LLM_MIN_MS;
  if (!looksWeak || !canAffordSecondPass) {
    return primary.text;
  }

  try {
    const plain = await preprocessForOcr(ocrReadyImage, false);
    const secondaryTimeout = Math.min(OCR_TIMEOUT_MS, remaining - LLM_MIN_MS);
    const secondary = await raceOcr(worker, plain, secondaryTimeout);
    return secondary.confidence > primary.confidence ? secondary.text : primary.text;
  } catch {
    // Second pass failed/timed out — the first pass's result is still usable, so fall back to it
    // rather than fail the whole page over a best-effort quality improvement.
    return primary.text;
  }
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
    const model = process.env.OPENROUTER_MODEL || "openai/gpt-oss-20b:free";

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
    try {
      worker = await Promise.race([
        createWorker(["eng"], undefined, {
          cachePath: TESSERACT_CACHE_PATH,
          langPath: LANG_DATA_PATH,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("The OCR engine failed to start in time — please try again in a moment.")),
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

        const rawText = await recognizeText(worker, image, deadline);
        if (!rawText.trim()) continue;
        const llmTimeoutMs = Math.max(LLM_MIN_MS, Math.min(OPENROUTER_TIMEOUT_MS, deadline - Date.now()));
        const receipts = await extractReceipts(rawText, apiKey, model, llmTimeoutMs);
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
