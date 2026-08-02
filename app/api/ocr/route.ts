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
  const prompt = `You are a document data-extraction assistant. The text below was extracted via OCR from a financial document — an invoice, a UK retail receipt, or a bank-statement line (it may contain OCR noise/typos). Extract these fields and respond with ONLY a raw JSON object, no markdown fences, no explanation:

{"vendorName": string|null, "invoiceNumber": string|null, "invoiceDate": string|null, "totalAmount": number|null, "currency": string|null, "vatAmount": number|null, "transactionType": string|null, "description": string|null, "debitAmount": number|null, "creditAmount": number|null, "balance": number|null, "accountName": string|null, "accountNumber": string|null, "sortCode": string|null, "vatNumber": string|null, "merchantAddress": string|null, "paymentMethod": string|null, "subtotal": number|null, "receiptTime": string|null}

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
- All amount fields must be plain numbers with no currency symbols, commas, or spaces, or null if not found.
- currency should be an ISO code (e.g. "GBP", "USD") if identifiable, else the symbol/word as written, else null.
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
      `OpenRouter error during field extraction (${res.status}): ${errText}. If the selected model is no longer free, change OPENROUTER_MODEL in .env.local — current free list: openrouter.ai/models?max_price=0`
    );
  }

  const json = await res.json();
  const content: string = json.choices?.[0]?.message?.content ?? "";
  const cleaned = content.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(`Model response could not be parsed (invalid JSON): ${content.slice(0, 300)}`);
  }
}

export async function POST(req: NextRequest) {
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

    if (file.type === "application/pdf" || file.name?.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        {
          error:
            "Only image files are supported right now — Tesseract can't read PDF directly. Please convert the file to an image before uploading.",
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || "openai/gpt-oss-20b:free";

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY is not set in .env.local" },
        { status: 500 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const worker = await createWorker(["eng"], undefined, {
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
        { error: "Tesseract couldn't extract any text from the image — check the image quality/clarity" },
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
    };

    return NextResponse.json({ success: true, data: extracted });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || `Unexpected error: ${err}` },
      { status: 500 }
    );
  }
}
