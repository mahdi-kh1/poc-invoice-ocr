import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;
// A GET-only route with no dynamic APIs (cookies/headers/searchParams) would otherwise get
// statically prerendered at build time — freezing this connectivity check as a single snapshot
// from build time instead of actually testing OpenRouter on every request.
export const dynamic = "force-dynamic";

// Same pattern as the OpenRouter calls in /api/ocr and /api/classify — abort before Vercel's own
// maxDuration kill would, so a slow/hung model produces a readable result here instead of a bare
// platform timeout.
const OPENROUTER_TIMEOUT_MS = 20_000;

function textResponse(body: string, status = 200) {
  return new NextResponse(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

// GET /ai-test — a plain-text page to check, from a browser, whether OPENROUTER_API_KEY is set
// and OpenRouter is actually reachable/responding, without needing to upload a file through the
// full OCR pipeline first. Not linked from the UI; visit it directly.
export async function GET() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "openai/gpt-oss-20b:free";

  const header = `AI connectivity test (OpenRouter)\n==================================\nModel: ${model}\n`;

  if (!apiKey) {
    return textResponse(
      `${header}Status: FAILED\n` +
        `Error: OPENROUTER_API_KEY is not set.\n\n` +
        `Locally: add it to .env.local and restart "npm run dev".\n` +
        `On Vercel: Project -> Settings -> Environment Variables, then redeploy.\n`,
      500
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS);
  const start = Date.now();
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Reply with only the word: pong" }],
        temperature: 0,
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    const elapsedMs = Date.now() - start;
    const text = await res.text();

    if (!res.ok) {
      return textResponse(
        `${header}Status: FAILED\nHTTP: ${res.status}\nLatency: ${elapsedMs}ms\n\n` +
          `OpenRouter error body:\n${text.slice(0, 1000)}\n\n` +
          `If the key looks right, check OPENROUTER_MODEL is still a free model: ` +
          `https://openrouter.ai/models?max_price=0\n`,
        502
      );
    }

    let content = "";
    try {
      content = JSON.parse(text).choices?.[0]?.message?.content ?? "";
    } catch {
      content = "(response was not valid JSON)";
    }

    return textResponse(
      `${header}Status: OK\nHTTP: ${res.status}\nLatency: ${elapsedMs}ms\nModel replied: ${content}\n`
    );
  } catch (err: any) {
    const elapsedMs = Date.now() - start;
    const isTimeout = err.name === "AbortError";
    return textResponse(
      `${header}Status: FAILED\nLatency: ${elapsedMs}ms\n\n` +
        (isTimeout
          ? `Timed out after ${OPENROUTER_TIMEOUT_MS / 1000}s — the free model may be slow/overloaded. Try again.\n`
          : `Error: ${err.message || err}\n`),
      isTimeout ? 504 : 500
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
