import { NextRequest, NextResponse } from "next/server";
import { createWorker } from "tesseract.js";
import path from "path";
import fs from "fs";
import type { OcrExtractedData } from "@/lib/types";

const TESSERACT_CACHE_PATH = path.join(process.cwd(), ".tesseract-cache");
// tesseract.js's Node cache writer does a plain fs.writeFile with no mkdir, so the
// trained-data cache silently never persists unless this directory already exists.
fs.mkdirSync(TESSERACT_CACHE_PATH, { recursive: true });

export const runtime = "nodejs";

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

async function extractFields(
  rawText: string,
  apiKey: string,
  model: string
): Promise<Record<string, unknown>> {
  const prompt = `You are an invoice data-extraction assistant. The text below was extracted via OCR from an invoice (it may be in Persian or English and may contain OCR noise/typos). Extract these fields and respond with ONLY a raw JSON object, no markdown fences, no explanation:

{"vendorName": string|null, "invoiceNumber": string|null, "invoiceDate": string|null, "totalAmount": number|null, "currency": string|null, "vatAmount": number|null}

Rules:
- totalAmount and vatAmount must be plain numbers with no currency symbols, commas, or spaces, or null if not found.
- currency should be an ISO code (e.g. "IRR", "USD") if identifiable, else the symbol/word as written, else null.
- Never guess — use null for anything not clearly present in the text.

OCR TEXT:
"""
${rawText.slice(0, 4000)}
"""`;

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
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `خطای OpenRouter در استخراج فیلدها (${res.status}): ${errText}. اگه مدل انتخابی دیگه رایگان نیست، OPENROUTER_MODEL رو توی .env.local عوض کن — لیست فعلی: openrouter.ai/models?max_price=0`
    );
  }

  const json = await res.json();
  const content: string = json.choices?.[0]?.message?.content ?? "";
  const cleaned = content.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(`پاسخ مدل قابل parse نبود (JSON نامعتبر): ${content.slice(0, 300)}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json(
        { error: "درخواست باید از نوع multipart/form-data با فیلد file باشه" },
        { status: 400 }
      );
    }
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "فایلی ارسال نشده" }, { status: 400 });
    }

    if (file.type === "application/pdf" || file.name?.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        {
          error:
            "فعلاً فقط فایل تصویری (jpg/png/...) پشتیبانی می‌شه — Tesseract مستقیم از PDF پشتیبانی نمی‌کنه. لطفاً فایل رو قبل از آپلود به تصویر تبدیل کن.",
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || "openai/gpt-oss-20b:free";

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY در .env.local تنظیم نشده" },
        { status: 500 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const worker = await createWorker(["eng", "fas"], undefined, {
      cachePath: TESSERACT_CACHE_PATH,
    });

    let rawText: string;
    try {
      const { data } = await worker.recognize(buffer);
      rawText = data.text || "";
    } finally {
      await worker.terminate();
    }

    if (!rawText.trim()) {
      return NextResponse.json(
        { error: "Tesseract نتونست متنی از تصویر استخراج کنه — کیفیت یا وضوح تصویر رو چک کن" },
        { status: 500 }
      );
    }

    const fields = await extractFields(rawText, apiKey, model);

    const extracted: OcrExtractedData = {
      vendorName: toStringOrNull(fields.vendorName),
      invoiceNumber: toStringOrNull(fields.invoiceNumber),
      invoiceDate: toStringOrNull(fields.invoiceDate),
      totalAmount: toNumberOrNull(fields.totalAmount),
      currency: toStringOrNull(fields.currency),
      vatAmount: toNumberOrNull(fields.vatAmount),
      rawText: rawText.slice(0, 2000),
    };

    return NextResponse.json({ success: true, data: extracted });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || `خطای غیرمنتظره: ${err}` },
      { status: 500 }
    );
  }
}
