"use client";

import { useState, useId } from "react";
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
  ocr_running: "در حال OCR…",
  ocr_done: "OCR انجام شد",
  ocr_error: "خطای OCR",
  classify_running: "در حال دسته‌بندی…",
  classify_done: "دسته‌بندی شد",
  classify_error: "خطای دسته‌بندی",
};

const numberFormatter = new Intl.NumberFormat("en-US");

function formatNumber(n: number | null | undefined) {
  return n === undefined || n === null ? "" : numberFormatter.format(n);
}

export default function Home() {
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [busy, setBusy] = useState(false);
  const fileInputId = useId();

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
    const csv = "﻿" + lines.join("\n"); // BOM برای نمایش درست فارسی در Excel
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
    <main id="main-content" className="app-shell">
      <header className="app-header">
        <h1 className="app-title">POC — استخراج و دسته‌بندی فاکتور</h1>
        <p className="app-subtitle">
          مرحله ۱: OCR با Tesseract.js (لوکال) + استخراج فیلد با OpenRouter &nbsp;|&nbsp; مرحله ۲: دسته‌بندی با
          OpenRouter (رایگان)
        </p>
      </header>

      <div className="upload-row">
        <label className="upload-label" htmlFor={fileInputId}>
          <span>انتخاب فایل‌های فاکتور</span>
        </label>
        <input
          id={fileInputId}
          name="invoiceFiles"
          className="visually-hidden"
          type="file"
          multiple
          accept="image/*,.pdf"
          onChange={handleFiles}
        />
        <span className="upload-hint">
          فقط تصویر (<span dir="ltr">jpg, png, …</span>) — PDF فعلاً پشتیبانی نمی‌شه
        </span>
      </div>

      <div className="toolbar">
        <button className="btn btn-primary" onClick={runOCR} disabled={busy || pendingCount === 0}>
          مرحله ۱: استخراج (OCR) — {pendingCount} فایل در صف
        </button>
        <button className="btn btn-primary" onClick={runClassify} disabled={busy || ocrDoneCount === 0}>
          مرحله ۲: دسته‌بندی — {ocrDoneCount} آماده
        </button>
        <button className="btn" onClick={exportCSV} disabled={rows.length === 0}>
          خروجی CSV
        </button>
      </div>

      <h2 className="visually-hidden">نتایج پردازش فاکتورها</h2>
      <div className="table-wrap">
        <table>
          <thead>
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
          <tbody aria-live="polite">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="cell-truncate" title={r.filename}>
                  {r.filename}
                </td>
                <td>
                  <span className={`status-badge status-${r.status}`}>{STATUS_LABELS[r.status]}</span>
                </td>
                <td className="cell-truncate" title={r.vendorName ?? undefined}>
                  {r.vendorName}
                </td>
                <td className="cell-truncate" title={r.invoiceNumber ?? undefined}>
                  {r.invoiceNumber}
                </td>
                <td className="cell-num">{r.invoiceDate}</td>
                <td className="cell-num">{formatNumber(r.totalAmount)}</td>
                <td>{r.currency}</td>
                <td className="cell-num">{formatNumber(r.vatAmount)}</td>
                <td className="cell-truncate" title={r.category}>
                  {r.category}
                </td>
                <td className="cell-num">{r.confidence !== undefined ? `${r.confidence}%` : ""}</td>
                <td className="cell-truncate cell-error" title={r.error}>
                  {r.error}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr className="empty-row">
                <td colSpan={11}>هنوز فایلی آپلود نشده</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
