import { NextRequest, NextResponse } from "next/server";
import type { OcrExtractedData } from "@/lib/types";

export const runtime = "nodejs";

// یه فیلد Azure Document Intelligence رو باز می‌کنه و مقدارش رو برمی‌گردونه
function fieldValue(field: any): string | number | null {
  if (!field) return null;
  if (field.valueString !== undefined) return field.valueString;
  if (field.valueNumber !== undefined) return field.valueNumber;
  if (field.valueDate !== undefined) return field.valueDate;
  if (field.content !== undefined) return field.content;
  return null;
}

function fieldCurrencyAmount(field: any): number | null {
  return field?.valueCurrency?.amount ?? null;
}

function fieldCurrencyCode(field: any): string | null {
  return field?.valueCurrency?.currencyCode ?? null;
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

    const endpoint = process.env.AZURE_DI_ENDPOINT;
    const key = process.env.AZURE_DI_KEY;

    if (!endpoint || !key) {
      return NextResponse.json(
        { error: "AZURE_DI_ENDPOINT یا AZURE_DI_KEY در .env.local تنظیم نشده" },
        { status: 500 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const analyzeUrl = `${endpoint.replace(
      /\/$/,
      ""
    )}/formrecognizer/documentModels/prebuilt-invoice:analyze?api-version=2023-07-31`;

    // مرحله ۱: ارسال درخواست تحلیل (Azure این کار رو async انجام می‌ده)
    const analyzeRes = await fetch(analyzeUrl, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": file.type || "application/octet-stream",
      },
      body: buffer,
    });

    if (analyzeRes.status !== 202) {
      const errText = await analyzeRes.text();
      return NextResponse.json(
        { error: `خطای Azure در ارسال فایل: ${errText}` },
        { status: 500 }
      );
    }

    const operationLocation = analyzeRes.headers.get("operation-location");
    if (!operationLocation) {
      return NextResponse.json(
        { error: "هدر operation-location از Azure برنگشت" },
        { status: 500 }
      );
    }

    // مرحله ۲: Poll کردن نتیجه (تا وقتی status = succeeded بشه)
    let result: any = null;
    const maxAttempts = 20;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 1500));

      const pollRes = await fetch(operationLocation, {
        headers: { "Ocp-Apim-Subscription-Key": key },
      });
      const pollJson = await pollRes.json();

      if (pollJson.status === "succeeded") {
        result = pollJson;
        break;
      }
      if (pollJson.status === "failed") {
        return NextResponse.json(
          { error: "پردازش OCR روی Azure شکست خورد", details: pollJson },
          { status: 500 }
        );
      }
      // در غیر این صورت status = running یا notStarted → ادامه‌ی حلقه
    }

    if (!result) {
      return NextResponse.json(
        { error: "پردازش OCR بیش از حد طول کشید (timeout)" },
        { status: 504 }
      );
    }

    const doc = result.analyzeResult?.documents?.[0];
    const fields = doc?.fields || {};

    const extracted: OcrExtractedData = {
      vendorName: (fieldValue(fields.VendorName) as string) ?? null,
      invoiceNumber: (fieldValue(fields.InvoiceId) as string) ?? null,
      invoiceDate: (fieldValue(fields.InvoiceDate) as string) ?? null,
      totalAmount:
        fieldCurrencyAmount(fields.InvoiceTotal) ??
        (fieldValue(fields.InvoiceTotal) as number) ??
        null,
      currency: fieldCurrencyCode(fields.InvoiceTotal) ?? null,
      vatAmount:
        fieldCurrencyAmount(fields.TotalTax) ??
        (fieldValue(fields.TotalTax) as number) ??
        null,
      rawText: (result.analyzeResult?.content ?? "").slice(0, 2000),
    };

    return NextResponse.json({ success: true, data: extracted });
  } catch (err: any) {
    return NextResponse.json(
      { error: `خطای غیرمنتظره: ${err.message}` },
      { status: 500 }
    );
  }
}
