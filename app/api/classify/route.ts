import { NextRequest, NextResponse } from "next/server";
import type { ClassifyResult } from "@/lib/types";
import { DEFAULT_CATEGORIES } from "@/lib/categories";
import { getModelChain } from "@/lib/models";

export const runtime = "nodejs";
export const maxDuration = 30;

// See the matching constant in app/api/ocr/route.ts — the free OpenRouter model's response time
// is highly variable, and Vercel's own timeout kill produces an HTML 504 instead of our JSON error
// format if this isn't aborted first. Unlike /api/ocr, this route has no OCR/worker overhead at
// all — it's a single JSON round-trip — so nearly the whole 30s maxDuration can go to this call;
// 20s was leaving real slack unused and cutting off responses that would have succeeded.
const OPENROUTER_TIMEOUT_MS = 26_000;

// Total budget for this request, including every fallback-model attempt (see classifyWithFallback)
// — leaves a few seconds of margin under maxDuration for request parsing and Vercel scheduling
// overhead so a chain of attempts still fails as our own JSON error instead of a raw platform 504.
const REQUEST_DEADLINE_MS = 27_000;

// Floor below which trying yet another fallback model isn't worth it — a request that's about to
// be starved anyway just wastes time before the inevitable "ran out of models" error.
const CLASSIFY_MIN_MS = 5_000;

// Opt-in via the `useVisionAssist` request field (see lib/settings.ts) — sends the receipt/invoice
// image alongside the extracted fields so visual cues (logo, letterhead, layout) can help pick a
// category the text alone left ambiguous. Uses a vision-capable model since the default text model
// (OPENROUTER_MODEL, e.g. gpt-oss-20b) can't accept image input — always re-check
// https://openrouter.ai/models?max_price=0 (filter for vision/image input) before relying on it.
const DEFAULT_VISION_MODEL = "nvidia/nemotron-nano-12b-v2-vl:free";

/**
 * One attempt against one model — throws a friendly Error on any failure (rate limit, timeout,
 * empty response, unparsable JSON) instead of building a NextResponse directly, so
 * classifyWithFallback can catch it and move on to the next model in the chain.
 */
async function classifyOnce(
  model: string,
  promptText: string,
  useVision: boolean,
  imageDataUrl: string | undefined,
  apiKey: string,
  timeoutMs: number
): Promise<ClassifyResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // AbortController alone only guarantees `fetch()` itself gets interrupted — it does NOT bound
  // `res.json()` afterward. That gap let a near-identical call in app/api/ocr/route.ts
  // (visionTranscribe) hang indefinitely with a slow/stalled response despite its "timeout"
  // supposedly firing. Wrapping the whole fetch+parse flow in Promise.race guarantees this
  // always resolves by timeoutMs regardless of what's actually slow inside it — and the try/catch
  // below wraps the whole flow (not just fetch()) so an abort that interrupts res.json() instead
  // gets the same friendly rewording, not a raw "This operation was aborted".
  const run = async (): Promise<ClassifyResult> => {
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
              content: useVision
                ? [
                    { type: "text", text: promptText },
                    { type: "image_url", image_url: { url: imageDataUrl } },
                  ]
                : promptText,
            },
          ],
          temperature: 0.1,
          // See the matching comments in app/api/ocr/route.ts's extractReceipts — without
          // max_tokens the provider default budget applies, and without capping reasoning effort
          // a reasoning-capable model can spend that whole budget on invisible "thinking" and
          // emit zero actual output. "low" is the safest universal setting — {enabled:false} 400s
          // on gpt-oss-20b, but every model in the fallback chain accepts "low", confirmed
          // directly against the OpenRouter API.
          max_tokens: 512,
          reasoning: { effort: "low" },
        }),
        signal: controller.signal,
        cache: "no-store",
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(
          `OpenRouter error (${res.status}): ${errText}. If the selected model is no longer free, change OPENROUTER_MODEL in .env.local — current free list: openrouter.ai/models?max_price=0`
        );
      }

      const json = await res.json();
      const choice = json.choices?.[0];
      const content: string = choice?.message?.content ?? "";

      // See the matching comment in app/api/ocr/route.ts's extractReceipts — content can be
      // genuinely empty (moderation refusal, degenerate free-model output) with an HTTP 200 and
      // no other signal, which reads as an unhelpful "invalid JSON" error unless checked first.
      if (!content.trim()) {
        const reason = choice?.finish_reason || choice?.message?.refusal || "no reason given by the model";
        throw new Error(
          `The AI model (${model}) returned an empty response (${reason}). This can happen when a free model is overloaded or briefly misbehaves — try again in a moment, or switch OPENROUTER_MODEL in .env.local to a different free model: openrouter.ai/models?max_price=0`
        );
      }

      try {
        const cleaned = content.replace(/```json|```/g, "").trim();
        return JSON.parse(cleaned);
      } catch {
        throw new Error(`Model response could not be parsed (invalid JSON): ${content.slice(0, 300)}`);
      }
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
 * Tries classifyOnce against each model in modelChain in turn, stopping at the first one that
 * succeeds — see the matching extractReceiptsWithFallback in app/api/ocr/route.ts for why this
 * matters: a free model being rate-limited or overloaded is a routine failure mode, not a rare
 * edge case. Each attempt's timeout is the remaining budget split evenly across the models not
 * yet tried (same reasoning as extractReceiptsWithFallback) rather than a flat per-attempt
 * ceiling, so a first model that's merely slow doesn't consume the whole deadline and starve
 * every fallback. Stops early once even a fair share can't clear CLASSIFY_MIN_MS, and surfaces
 * one aggregated friendly error only if every attempted model failed.
 */
async function classifyWithFallback(
  promptText: string,
  useVision: boolean,
  imageDataUrl: string | undefined,
  apiKey: string,
  modelChain: string[],
  deadline: number
): Promise<ClassifyResult> {
  let lastError: Error | null = null;
  for (let i = 0; i < modelChain.length; i++) {
    const remaining = deadline - Date.now();
    if (remaining < CLASSIFY_MIN_MS) break;
    const modelsLeft = modelChain.length - i;
    const timeoutMs = Math.max(
      CLASSIFY_MIN_MS,
      Math.min(OPENROUTER_TIMEOUT_MS, Math.floor(remaining / modelsLeft))
    );
    try {
      return await classifyOnce(modelChain[i], promptText, useVision, imageDataUrl, apiKey, timeoutMs);
    } catch (err: any) {
      lastError = err;
    }
  }
  throw new Error(
    `All free AI models are currently rate-limited or unavailable — you've hit today's free-tier usage across every fallback model (last error: ${lastError?.message || "unknown"}). Try again in a few minutes, or add your own OpenRouter API key for higher limits: https://openrouter.ai/keys`
  );
}

export async function POST(req: NextRequest) {
  const deadline = Date.now() + REQUEST_DEADLINE_MS;
  try {
    const body = await req.json();
    const { vendorName, totalAmount, currency, invoiceNumber, rawText, categories, useVisionAssist, imageDataUrl } =
      body;

    const categoryList: string[] =
      Array.isArray(categories) && categories.length > 0
        ? categories.filter((c: unknown) => typeof c === "string" && c.trim().length > 0)
        : DEFAULT_CATEGORIES;

    const apiKey = process.env.OPENROUTER_API_KEY;
    const visionModel = process.env.OPENROUTER_VISION_MODEL || DEFAULT_VISION_MODEL;
    // Only actually use vision if the caller both asked for it and supplied an image — a PDF row
    // has no client-side rendered image to send (see app/page.tsx), so this falls back to
    // text-only classification for those even with the setting on.
    const useVision = useVisionAssist === true && typeof imageDataUrl === "string" && imageDataUrl.length > 0;
    // Vision-capable free models are scarce, so there's just the one configured — no fallback
    // chain for that path. Text classification uses the full fallback chain (see lib/models.ts).
    const modelChain = useVision ? [visionModel] : getModelChain();

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY is not set in .env.local" },
        { status: 500 }
      );
    }

    const promptText = `You are an accounting assistant. Based on the following invoice data${useVision ? " and the attached image of the document" : ""}, classify the expense into EXACTLY ONE category from this list:
${categoryList.join(", ")}

Vendor: ${vendorName || "unknown"}
Total Amount: ${totalAmount ?? "unknown"} ${currency || ""}
Invoice Number: ${invoiceNumber || "unknown"}
Extracted Text (partial): ${(rawText || "").slice(0, 800)}
${useVision ? "\nThe attached image is the original scanned document — use its visible logo, letterhead, layout, or any other visual cue to help disambiguate the category if the text above is unclear or sparse." : ""}

Respond ONLY with a raw JSON object, no markdown fences, no explanation:
{"category": "<one of the categories above>", "confidence": <integer 0-100>}`;

    const parsed = await classifyWithFallback(promptText, useVision, imageDataUrl, apiKey, modelChain, deadline);
    return NextResponse.json({ success: true, data: parsed });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || `Unexpected error: ${err}` },
      { status: 500 }
    );
  }
}
