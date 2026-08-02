"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { RowStatus } from "@/lib/types";
import { DEFAULT_CATEGORIES, CATEGORIES_STORAGE_KEY } from "@/lib/categories";

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
  transactionType?: string | null;
  description?: string | null;
  debitAmount?: number | null;
  creditAmount?: number | null;
  balance?: number | null;
  accountName?: string | null;
  accountNumber?: string | null;
  sortCode?: string | null;
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

const DETAIL_FIELDS: { key: keyof InvoiceRow; label: string; numeric?: boolean }[] = [
  { key: "vendorName", label: "فروشنده" },
  { key: "invoiceNumber", label: "شماره فاکتور" },
  { key: "invoiceDate", label: "تاریخ فاکتور" },
  { key: "totalAmount", label: "مبلغ کل", numeric: true },
  { key: "currency", label: "ارز" },
  { key: "vatAmount", label: "مالیات", numeric: true },
  { key: "transactionType", label: "نوع تراکنش" },
  { key: "description", label: "شرح تراکنش" },
  { key: "debitAmount", label: "برداشت (بدهکار)", numeric: true },
  { key: "creditAmount", label: "واریز (بستانکار)", numeric: true },
  { key: "balance", label: "مانده حساب", numeric: true },
  { key: "accountName", label: "نام حساب" },
  { key: "accountNumber", label: "شماره حساب" },
  { key: "sortCode", label: "کد شعبه" },
  { key: "category", label: "دسته‌بندی" },
  { key: "confidence", label: "اطمینان", numeric: true },
];

const numberFormatter = new Intl.NumberFormat("en-US");

function formatNumber(n: number | null | undefined) {
  return n === undefined || n === null ? "" : numberFormatter.format(n);
}

function formatDetailValue(key: keyof InvoiceRow, value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (key === "confidence") return `${value}%`;
  if (typeof value === "number") return formatNumber(value);
  return String(value);
}

export default function Home() {
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [newCategory, setNewCategory] = useState("");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputId = useId();
  const newCategoryId = useId();
  const detailDialogRef = useRef<HTMLDialogElement>(null);
  const categoriesDialogRef = useRef<HTMLDialogElement>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const selectedRow = rows.find((r) => r.id === selectedRowId) || null;

  // Load user-defined categories saved from a previous session (client-only — avoids hydration mismatch).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.every((c) => typeof c === "string")) {
          setCategories(parsed);
        }
      }
    } catch {
      // localStorage unavailable or corrupt — keep defaults
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
    } catch {
      // ignore persistence failures (e.g. private browsing quota)
    }
  }, [categories]);

  useEffect(() => {
    const dialog = detailDialogRef.current;
    if (!dialog) return;
    if (selectedRowId) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [selectedRowId]);

  useEffect(() => {
    const dialog = categoriesDialogRef.current;
    if (!dialog) return;
    if (categoriesOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [categoriesOpen]);

  useEffect(() => {
    if (!selectedRow) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedRow.file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRow?.id]);

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
          transactionType: json.data.transactionType,
          description: json.data.description,
          debitAmount: json.data.debitAmount,
          creditAmount: json.data.creditAmount,
          balance: json.data.balance,
          accountName: json.data.accountName,
          accountNumber: json.data.accountNumber,
          sortCode: json.data.sortCode,
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
            categories,
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
      "transactionType",
      "description",
      "debitAmount",
      "creditAmount",
      "balance",
      "accountName",
      "accountNumber",
      "sortCode",
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

  function addCategory(e: React.FormEvent) {
    e.preventDefault();
    const name = newCategory.trim();
    if (!name) return;
    if (categories.some((c) => c.toLowerCase() === name.toLowerCase())) {
      setNewCategory("");
      return;
    }
    setCategories((prev) => [...prev, name]);
    setNewCategory("");
  }

  function removeCategory(name: string) {
    setCategories((prev) => prev.filter((c) => c !== name));
  }

  function resetCategories() {
    setCategories(DEFAULT_CATEGORIES);
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
        <button className="btn" onClick={() => setCategoriesOpen(true)}>
          دسته‌بندی‌ها ({categories.length})
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
              <th>تاریخ</th>
              <th>مبلغ کل</th>
              <th>ارز</th>
              <th>دسته‌بندی</th>
              <th>اطمینان</th>
              <th>جزئیات</th>
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
                <td className="cell-num">{r.invoiceDate}</td>
                <td className="cell-num">{formatNumber(r.totalAmount)}</td>
                <td>{r.currency}</td>
                <td className="cell-truncate" title={r.category}>
                  {r.category}
                </td>
                <td className="cell-num">{r.confidence !== undefined ? `${r.confidence}%` : ""}</td>
                <td>
                  <button className="btn btn-small" onClick={() => setSelectedRowId(r.id)}>
                    مشاهده
                  </button>
                </td>
                <td className="cell-truncate cell-error" title={r.error}>
                  {r.error}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr className="empty-row">
                <td colSpan={10}>هنوز فایلی آپلود نشده</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <dialog
        ref={detailDialogRef}
        className="detail-dialog"
        onClose={() => setSelectedRowId(null)}
        onClick={(e) => {
          if (e.target === detailDialogRef.current) detailDialogRef.current?.close();
        }}
        aria-labelledby="detail-dialog-title"
      >
        {selectedRow && (
          <div className="dialog-body">
            <div className="dialog-header">
              <h2 id="detail-dialog-title" className="dialog-title">
                {selectedRow.filename}
              </h2>
              <button
                className="btn btn-icon"
                aria-label="بستن پنجره"
                onClick={() => detailDialogRef.current?.close()}
              >
                ×
              </button>
            </div>
            <div className="dialog-content">
              <div className="dialog-image-wrap">
                {previewUrl ? (
                  <img src={previewUrl} alt={`تصویر فاکتور ${selectedRow.filename}`} className="dialog-image" />
                ) : (
                  <div className="dialog-image-placeholder">پیش‌نمایش در دسترس نیست</div>
                )}
              </div>
              <dl className="detail-list">
                <div className="detail-row">
                  <dt>وضعیت</dt>
                  <dd>
                    <span className={`status-badge status-${selectedRow.status}`}>
                      {STATUS_LABELS[selectedRow.status]}
                    </span>
                  </dd>
                </div>
                {DETAIL_FIELDS.map((f) => (
                  <div className="detail-row" key={f.key}>
                    <dt>{f.label}</dt>
                    <dd className={f.numeric ? "cell-num" : undefined}>
                      {formatDetailValue(f.key, selectedRow[f.key])}
                    </dd>
                  </div>
                ))}
                {selectedRow.error && (
                  <div className="detail-row">
                    <dt>خطا</dt>
                    <dd className="cell-error">{selectedRow.error}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        )}
      </dialog>

      <dialog
        ref={categoriesDialogRef}
        className="categories-dialog"
        onClose={() => setCategoriesOpen(false)}
        onClick={(e) => {
          if (e.target === categoriesDialogRef.current) categoriesDialogRef.current?.close();
        }}
        aria-labelledby="categories-dialog-title"
      >
        <div className="dialog-body">
          <div className="dialog-header">
            <h2 id="categories-dialog-title" className="dialog-title">
              مدیریت دسته‌بندی‌ها
            </h2>
            <button
              className="btn btn-icon"
              aria-label="بستن پنجره"
              onClick={() => categoriesDialogRef.current?.close()}
            >
              ×
            </button>
          </div>
          <div className="dialog-content dialog-content-stack">
            <p className="app-subtitle">
              این دسته‌ها در مرحله ۲ (دسته‌بندی) به مدل پیشنهاد داده می‌شن و روی همین مرورگر ذخیره می‌مونن.
            </p>
            <ul className="category-chip-list">
              {categories.map((c) => (
                <li key={c} className="category-chip">
                  <span>{c}</span>
                  <button
                    type="button"
                    className="chip-remove"
                    aria-label={`حذف دسته «${c}»`}
                    onClick={() => removeCategory(c)}
                  >
                    ×
                  </button>
                </li>
              ))}
              {categories.length === 0 && <li className="app-subtitle">هیچ دسته‌ای تعریف نشده</li>}
            </ul>
            <form className="category-add-form" onSubmit={addCategory}>
              <label htmlFor={newCategoryId} className="visually-hidden">
                دسته‌بندی جدید
              </label>
              <input
                id={newCategoryId}
                name="newCategory"
                type="text"
                autoComplete="off"
                placeholder="مثلاً: هزینه‌های اداری…"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" disabled={!newCategory.trim()}>
                افزودن
              </button>
            </form>
            <button type="button" className="btn btn-ghost-danger" onClick={resetCategories}>
              بازگشت به دسته‌بندی‌های پیش‌فرض
            </button>
          </div>
        </div>
      </dialog>
    </main>
  );
}
