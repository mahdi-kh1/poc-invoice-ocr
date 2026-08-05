import { NextRequest, NextResponse } from "next/server";
import type { ClassifyResult } from "@/lib/types";
import { DEFAULT_CATEGORIES } from "@/lib/categories";

export const runtime = "nodejs";
export const maxDuration = 30;

// See the matching constant in app/api/ocr/route.ts — the free OpenRouter model's response time
// is highly variable, and Vercel's own timeout kill produces an HTML 504 instead of our JSON error
// format if this isn't aborted first. Unlike /api/ocr, this route has no OCR/worker overhead at
// all — it's a single JSON round-trip — so nearly the whole 30s maxDuration can go to this call;
// 20s was leaving real slack unused and cutting off responses that would have succeeded.
const OPENROUTER_TIMEOUT_MS = 26_000;

// Opt-in via the `useVisionAssist` request field (see lib/settings.ts) — sends the receipt/invoice
// image alongside the extracted fields so visual cues (logo, letterhead, layout) can help pick a
// category the text alone left ambiguous. Uses a vision-capable model since the default text model
// (OPENROUTER_MODEL, e.g. gpt-oss-20b) can't accept image input — always re-check
// https://openrouter.ai/models?max_price=0 (filter for vision/image input) before relying on it.
const DEFAULT_VISION_MODEL = "nvidia/nemotron-nano-12b-v2-vl:free";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { vendorName, totalAmount, currency, invoiceNumber, rawText, categories, useVisionAssist, imageDataUrl } =
      body;

    const categoryList: string[] =
      Array.isArray(categories) && categories.length > 0
        ? categories.filter((c: unknown) => typeof c === "string" && c.trim().length > 0)
        : DEFAULT_CATEGORIES;

    const apiKey = process.env.OPENROUTER_API_KEY;
    const textModel = process.env.OPENROUTER_MODEL || "openai/gpt-oss-20b:free";
    const visionModel = process.env.OPENROUTER_VISION_MODEL || DEFAULT_VISION_MODEL;
    // Only actually use vision if the caller both asked for it and supplied an image — a PDF row
    // has no client-side rendered image to send (see app/page.tsx), so this falls back to
    // text-only classification for those even with the setting on.
    const useVision = useVisionAssist === true && typeof imageDataUrl === "string" && imageDataUrl.length > 0;
    const model = useVision ? visionModel : textModel;

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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS);

    // AbortController alone only guarantees `fetch()` itself gets interrupted — it does NOT bound
    // `res.json()` afterward. That gap let a near-identical call in app/api/ocr/route.ts
    // (visionTranscribe) hang indefinitely with a slow/stalled response despite its "timeout"
    // supposedly firing. Wrapping the whole fetch+parse flow in Promise.race guarantees this
    // always resolves by OPENROUTER_TIMEOUT_MS regardless of what's actually slow inside it — and
    // the try/catch below wraps the whole flow (not just fetch()) so an abort that interrupts
    // res.json() instead gets the same friendly rewording, not a raw "This operation was aborted".
    const run = async (): Promise<NextResponse> => {
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
          }),
          signal: controller.signal,
          cache: "no-store",
        });

        if (!res.ok) {
          const errText = await res.text();
          return NextResponse.json(
            {
              error: `OpenRouter error (${res.status}): ${errText}. If the selected model is no longer free, change OPENROUTER_MODEL in .env.local — current free list: openrouter.ai/models?max_price=0`,
            },
            { status: 500 }
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
          return NextResponse.json(
            {
              error: `The AI model (${model}) returned an empty response (${reason}). This can happen when a free model is overloaded or briefly misbehaves — try again in a moment, or switch OPENROUTER_MODEL in .env.local to a different free model: openrouter.ai/models?max_price=0`,
            },
            { status: 500 }
          );
        }

        let parsed: ClassifyResult;
        try {
          const cleaned = content.replace(/```json|```/g, "").trim();
          parsed = JSON.parse(cleaned);
        } catch (e) {
          return NextResponse.json(
            { error: "Model response could not be parsed (invalid JSON)", raw: content },
            { status: 500 }
          );
        }

        return NextResponse.json({ success: true, data: parsed });
      } catch (err: any) {
        if (err.name === "AbortError") {
          return NextResponse.json(
            {
              error: `The AI model (${model}) took longer than ${OPENROUTER_TIMEOUT_MS / 1000}s to respond — free OpenRouter models can be slow or overloaded. Try again in a moment, or switch OPENROUTER_MODEL in .env.local to a different free model: openrouter.ai/models?max_price=0`,
            },
            { status: 500 }
          );
        }
        throw err;
      }
    };

    try {
      return await Promise.race([
        run(),
        new Promise<NextResponse>((resolve) =>
          setTimeout(
            () =>
              resolve(
                NextResponse.json(
                  {
                    error: `The AI model (${model}) took longer than ${OPENROUTER_TIMEOUT_MS / 1000}s to respond — free OpenRouter models can be slow or overloaded. Try again in a moment, or switch OPENROUTER_MODEL in .env.local to a different free model: openrouter.ai/models?max_price=0`,
                  },
                  { status: 500 }
                )
              ),
            OPENROUTER_TIMEOUT_MS
          )
        ),
      ]);
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: `Unexpected error: ${err.message}` },
      { status: 500 }
    );
  }
}
