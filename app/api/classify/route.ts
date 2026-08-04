import { NextRequest, NextResponse } from "next/server";
import type { ClassifyResult } from "@/lib/types";
import { DEFAULT_CATEGORIES } from "@/lib/categories";

export const runtime = "nodejs";
export const maxDuration = 30;

// See the matching constant in app/api/ocr/route.ts — the free OpenRouter model's response time
// is highly variable, and Vercel's own timeout kill produces an HTML 504 instead of our JSON error
// format if this isn't aborted first.
const OPENROUTER_TIMEOUT_MS = 20_000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { vendorName, totalAmount, currency, invoiceNumber, rawText, categories } = body;

    const categoryList: string[] =
      Array.isArray(categories) && categories.length > 0
        ? categories.filter((c: unknown) => typeof c === "string" && c.trim().length > 0)
        : DEFAULT_CATEGORIES;

    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || "openai/gpt-oss-20b:free";

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY is not set in .env.local" },
        { status: 500 }
      );
    }

    const prompt = `You are an accounting assistant. Based on the following invoice data, classify the expense into EXACTLY ONE category from this list:
${categoryList.join(", ")}

Vendor: ${vendorName || "unknown"}
Total Amount: ${totalAmount ?? "unknown"} ${currency || ""}
Invoice Number: ${invoiceNumber || "unknown"}
Extracted Text (partial): ${(rawText || "").slice(0, 800)}

Respond ONLY with a raw JSON object, no markdown fences, no explanation:
{"category": "<one of the categories above>", "confidence": <integer 0-100>}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS);
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
        return NextResponse.json(
          {
            error: `The AI model (${model}) took longer than ${OPENROUTER_TIMEOUT_MS / 1000}s to respond — free OpenRouter models can be slow or overloaded. Try again in a moment, or switch OPENROUTER_MODEL in .env.local to a different free model: openrouter.ai/models?max_price=0`,
          },
          { status: 500 }
        );
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

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
    const content: string = json.choices?.[0]?.message?.content ?? "";

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
    return NextResponse.json(
      { error: `Unexpected error: ${err.message}` },
      { status: 500 }
    );
  }
}
