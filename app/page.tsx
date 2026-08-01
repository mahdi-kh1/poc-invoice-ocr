"use client";

import { useState } from "react";
import type { RowStatus } from "@/lib/types";

interface InvoiceRow {
  id: string;
  filename: string;
  file: File;
  status: RowStatus;
  vendorName?: string | null;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  totalAmount?: number | null;
  currency?: string | null;
  vatAmount?: number | null;
  rawText?: string;
  category?: string;
  confidence?: number;
  error?: string;
}

const STATUS_LABELS: Record<RowStatus, string> = {
  pending: "در صف",
  ocr_running: "در حال OCR...",
  ocr_done: "OCR انجام شد",
  ocr_error: "خطای OCR",
  classify_running: "در حال دسته‌بندی...",
  classify_done: "دسته‌بندی شد",
  classify_error: "خطای دسته‌بندی",
};

export default function Home() {
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [busy, setBusy] = useState(false);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const newRows: InvoiceRow[] = files.map((f) => ({
      id: `${f.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      filename: f.name,
      file: f,
      status: "pending",
    }));
    setRows((prev) => [...prev, ...newRows]);
    e.target.value = "";
  }

  function updateRow(id: string, patch: Partial<InvoiceRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function runOCR() {
    setBusy(true);
    const targets = rows.filter((r) => r.status === "pending");
    for (const row of targets) {
      updateRow(row.id, { status: "ocr_running", error: undefined });
      try {
        const fd = new FormData();
        fd.append("file", row.file);
        const res = await fetch("/api/ocr", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || "OCR ناموفق بود");
        }
        updateRow(row.id, {
          status: "ocr_done",
          vendorName: json.data.vendorName,
          invoiceNumber: json.data.invoiceNumber,
          invoiceDate: json.data.invoiceDate,
          totalAmount: json.data.totalAmount,
          currency: json.data.currency,
          vatAmount: json.data.vatAmount,
          rawText: json.data.rawText,
        });
      } catch (err: any) {
        updateRow(row.id, { status: "ocr_error", error: err.message });
      }
    }
    setBusy(false);
  }

  async function runClassify() {
    setBusy(true);
    const targets = rows.filter((r) => r.status === "ocr_done");
    for (const row of targets) {
      updateRow(row.id, { status: "classify_running", error: undefined });
      try {
        const res = await fetch("/api/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vendorName: row.vendorName,
            totalAmount: row.totalAmount,
            currency: row.currency,
            invoiceNumber: row.invoiceNumber,
            rawText: row.rawText,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || "دسته‌بندی ناموفق بود");
        }
        updateRow(row.id, {
          status: "classify_done",
          category: json.data.category,
          confidence: json.data.confidence,
        });
      } catch (err: any) {
        updateRow(row.id, { status: "classify_error", error: err.message });
      }
    }
    setBusy(false);
  }

  function exportCSV() {
    const headers = [
      "filename",
      "vendorName",
      "invoiceNumber",
      "invoiceDate",
      "totalAmount",
      "currency",
      "vatAmount",
      "category",
      "confidence",
      "status",
    ];
    const lines = [headers.join(",")];
    for (const r of rows) {
      const vals = headers.map((h) => {
        const v = (r as any)[h];
        if (v === undefined || v === null) return "";
        const s = String(v).replace(/"/g, '""');
        return /[",\n]/.test(s) ? `"${s}"` : s;
      });
      lines.push(vals.join(","));
    }
    const csv = "\uFEFF" + lines.join("\n"); // BOM برای نمایش درست فارسی در Excel
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-results-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const pendingCount = rows.filter((r) => r.status === "pending").length;
  const ocrDoneCount = rows.filter((r) => r.status === "ocr_done").length;

  return (
    <main style={{ fontFamily: "Tahoma, sans-serif", padding: 24, maxWidth: 1300, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 4 }}>POC — استخراج و دسته‌بندی فاکتور</h1>
      <p style={{ color: "#555", marginTop: 0 }}>
        مرحله ۱: OCR با Azure Document Intelligence &nbsp;|&nbsp; مرحله ۲: دسته‌بندی با OpenRouter (رایگان)
      </p>

      <div style={{ margin: "16px 0" }}>
        <input type="file" multiple accept="image/*,.pdf" onChange={handleFiles} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <button onClick={runOCR} disabled={busy || pendingCount === 0}>
          مرحله ۱: استخراج (OCR) — {pendingCount} فایل در صف
        </button>
        <button onClick={runClassify} disabled={busy || ocrDoneCount === 0}>
          مرحله ۲: دسته‌بندی — {ocrDoneCount} آماده
        </button>
        <button onClick={exportCSV} disabled={rows.length === 0}>
          خروجی CSV
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          border={1}
          cellPadding={6}
          style={{ borderCollapse: "collapse", width: "100%", fontSize: 13, minWidth: 1100 }}
        >
          <thead style={{ background: "#f2f2f2" }}>
            <tr>
              <th>فایل</th>
              <th>وضعیت</th>
              <th>فروشنده</th>
              <th>شماره فاکتور</th>
              <th>تاریخ</th>
              <th>مبلغ کل</th>
              <th>ارز</th>
              <th>مالیات</th>
              <th>دسته‌بندی</th>
              <th>اطمینان</th>
              <th>خطا</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.filename}</td>
                <td>{STATUS_LABELS[r.status]}</td>
                <td>{r.vendorName}</td>
                <td>{r.invoiceNumber}</td>
                <td>{r.invoiceDate}</td>
                <td>{r.totalAmount}</td>
                <td>{r.currency}</td>
                <td>{r.vatAmount}</td>
                <td>{r.category}</td>
                <td>{r.confidence !== undefined ? `${r.confidence}%` : ""}</td>
                <td style={{ color: "red", maxWidth: 200 }}>{r.error}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} style={{ textAlign: "center", color: "#999", padding: 24 }}>
                  هنوز فایلی آپلود نشده
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
