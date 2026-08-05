"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import type { RowStatus } from "@/lib/types";
import { DEFAULT_CATEGORIES, CATEGORIES_STORAGE_KEY } from "@/lib/categories";
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, type AppSettings } from "@/lib/settings";

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
  vatNumber?: string | null;
  merchantAddress?: string | null;
  paymentMethod?: string | null;
  subtotal?: number | null;
  receiptTime?: string | null;
  rawText?: string;
  category?: string;
  confidence?: number;
  error?: string;
  pageNumber?: number | null;
  /** Set when this row is one of several receipts fanned out from a single uploaded file. */
  sourceLabel?: string;
}

const STATUS_LABELS: Record<RowStatus, string> = {
  pending: "Pending",
  ocr_running: "Running OCR…",
  ocr_done: "OCR Done",
  ocr_error: "OCR Error",
  classify_running: "Classifying…",
  classify_done: "Classified",
  classify_error: "Classification Error",
};

const DETAIL_FIELDS: { key: keyof InvoiceRow; label: string; numeric?: boolean; editable?: boolean }[] = [
  { key: "vendorName", label: "Vendor" },
  { key: "invoiceNumber", label: "Invoice Number" },
  { key: "invoiceDate", label: "Invoice Date" },
  { key: "receiptTime", label: "Receipt Time" },
  { key: "pageNumber", label: "PDF Page", editable: false },
  { key: "totalAmount", label: "Total Amount", numeric: true },
  { key: "subtotal", label: "Subtotal (before VAT)", numeric: true },
  { key: "currency", label: "Currency" },
  { key: "vatAmount", label: "VAT Amount", numeric: true },
  { key: "vatNumber", label: "VAT Number" },
  { key: "paymentMethod", label: "Payment Method" },
  { key: "merchantAddress", label: "Merchant Address" },
  { key: "transactionType", label: "Transaction Type" },
  { key: "description", label: "Description" },
  { key: "debitAmount", label: "Debit Amount", numeric: true },
  { key: "creditAmount", label: "Credit Amount", numeric: true },
  { key: "balance", label: "Balance", numeric: true },
  { key: "accountName", label: "Account Name" },
  { key: "accountNumber", label: "Account Number" },
  { key: "sortCode", label: "Sort Code" },
  { key: "category", label: "Category", editable: false },
  { key: "confidence", label: "Confidence", numeric: true, editable: false },
];

// Editing is allowed once OCR has produced a result and nothing is actively running — this is
// the window where the user should review/fill in missing fields before Step 2 classifies them.
const EDITABLE_STATUSES: RowStatus[] = ["ocr_done", "ocr_error", "classify_done", "classify_error"];

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

// API routes always respond with JSON, but if the dev server is mid-recompile (or a broken
// build/proxy sits in front of it) it can serve an HTML error page instead — parsing that as
// JSON throws the cryptic "Unexpected token '<' ... is not valid JSON". Surface something
// diagnosable instead.
async function parseApiResponse(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `Server returned a non-JSON response (HTTP ${res.status}). The dev server may still be (re)compiling — wait a moment and retry, or check the terminal running "npm run dev" for the actual error.`
    );
  }
}

// Vision-assisted classification (see lib/settings.ts) sends the image inline as a base64 data
// URL rather than switching /api/classify to multipart — the payload is small (receipt-sized
// images) and this keeps that route's request shape as plain JSON either way.
function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [newCategory, setNewCategory] = useState("");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [magnifier, setMagnifier] = useState<{
    x: number;
    y: number;
    bgWidth: number;
    bgHeight: number;
    bgX: number;
    bgY: number;
  } | null>(null);
  const imageWrapRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null);
  const fileInputId = useId();
  const newCategoryId = useId();
  const detailDialogRef = useRef<HTMLDialogElement>(null);
  const categoriesDialogRef = useRef<HTMLDialogElement>(null);
  const helpDialogRef = useRef<HTMLDialogElement>(null);
  const settingsDialogRef = useRef<HTMLDialogElement>(null);
  const aboutDialogRef = useRef<HTMLDialogElement>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

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

  // Load saved vision-assist preferences from a previous session (client-only, same reasoning as
  // categories above — avoids a server/client hydration mismatch since localStorage doesn't exist
  // during SSR).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setSettings({
            visionOcrAssist: parsed.visionOcrAssist === true,
            visionClassifyAssist: parsed.visionClassifyAssist === true,
          });
        }
      }
    } catch {
      // localStorage unavailable or corrupt — keep defaults
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore persistence failures (e.g. private browsing quota)
    }
  }, [settings]);

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
    const dialog = helpDialogRef.current;
    if (!dialog) return;
    if (helpOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [helpOpen]);

  useEffect(() => {
    const dialog = settingsDialogRef.current;
    if (!dialog) return;
    if (settingsOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [settingsOpen]);

  useEffect(() => {
    const dialog = aboutDialogRef.current;
    if (!dialog) return;
    if (aboutOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [aboutOpen]);

  useEffect(() => {
    setPreviewZoom(1);
    setMagnifier(null);
    dragState.current = null;
    if (!selectedRow) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedRow.file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRow?.id]);

  const MAGNIFIER_SIZE = 180;
  const MAGNIFIER_FACTOR = 2.5;

  // At fit-to-container zoom, hovering shows a magnifier lens (better for spot-checking small
  // print than the old scale-and-scroll zoom). Once actually zoomed in, drag-to-pan takes over
  // instead (see handleImageWrapMouseDown) — the two tools don't overlap.
  function handleImageMouseMove(e: React.MouseEvent<HTMLImageElement>) {
    if (previewZoom !== 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;
    setMagnifier({
      x: e.clientX,
      y: e.clientY,
      bgWidth: rect.width * MAGNIFIER_FACTOR,
      bgHeight: rect.height * MAGNIFIER_FACTOR,
      bgX: -(relX * MAGNIFIER_FACTOR - MAGNIFIER_SIZE / 2),
      bgY: -(relY * MAGNIFIER_FACTOR - MAGNIFIER_SIZE / 2),
    });
  }

  function handleImageMouseLeave() {
    setMagnifier(null);
  }

  function handleImageWrapMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (previewZoom <= 1) return;
    const wrap = imageWrapRef.current;
    if (!wrap) return;
    dragState.current = { startX: e.clientX, startY: e.clientY, scrollLeft: wrap.scrollLeft, scrollTop: wrap.scrollTop };
    wrap.classList.add("dialog-image-wrap-dragging");
  }

  function handleImageWrapMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const drag = dragState.current;
    const wrap = imageWrapRef.current;
    if (!drag || !wrap) return;
    wrap.scrollLeft = drag.scrollLeft - (e.clientX - drag.startX);
    wrap.scrollTop = drag.scrollTop - (e.clientY - drag.startY);
  }

  function endImageWrapDrag() {
    dragState.current = null;
    imageWrapRef.current?.classList.remove("dialog-image-wrap-dragging");
  }

  // Native <dialog> "light dismiss": e.target === dialog is the commonly-cited trick, but it can
  // fail to fire depending on how the dialog's content fills its box — checking the click's
  // coordinates against the dialog's own rendered rect is the robust version of the same idea.
  function closeDialogOnBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    const dialog = e.currentTarget;
    const rect = dialog.getBoundingClientRect();
    const insideDialog =
      e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
    if (!insideDialog) dialog.close();
  }

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

  // Replaces one row with one-or-more rows — a single uploaded file (esp. a multi-page or
  // multi-receipt PDF) can yield several extracted receipts from a single OCR call.
  function expandRow(id: string, replacements: InvoiceRow[]) {
    setRows((prev) => prev.flatMap((r) => (r.id === id ? replacements : [r])));
  }

  function handleDetailFieldChange(rowId: string, key: keyof InvoiceRow, numeric: boolean | undefined, raw: string) {
    if (numeric) {
      const n = raw.trim() === "" ? null : Number(raw);
      updateRow(rowId, { [key]: raw.trim() === "" || !Number.isFinite(n) ? null : n } as Partial<InvoiceRow>);
    } else {
      updateRow(rowId, { [key]: raw === "" ? null : raw } as Partial<InvoiceRow>);
    }
  }

  async function runOCR() {
    setBusy(true);
    const targets = rows.filter((r) => r.status === "pending");
    for (const row of targets) {
      updateRow(row.id, { status: "ocr_running", error: undefined });
      try {
        const fd = new FormData();
        fd.append("file", row.file);
        fd.append("useVisionAssist", String(settings.visionOcrAssist));
        const res = await fetch("/api/ocr", { method: "POST", body: fd });
        const json = await parseApiResponse(res);
        if (!res.ok || !json.success) {
          throw new Error(json.error || "OCR failed");
        }
        const results: any[] = Array.isArray(json.data) ? json.data : [json.data];
        const newRows: InvoiceRow[] = results.map((data, idx) => ({
          ...row,
          id: results.length === 1 ? row.id : `${row.id}-${idx}`,
          status: "ocr_done",
          sourceLabel:
            results.length > 1
              ? data.pageNumber
                ? `page ${data.pageNumber}, receipt ${idx + 1}`
                : `receipt ${idx + 1}`
              : undefined,
          vendorName: data.vendorName,
          invoiceNumber: data.invoiceNumber,
          invoiceDate: data.invoiceDate,
          totalAmount: data.totalAmount,
          currency: data.currency,
          vatAmount: data.vatAmount,
          transactionType: data.transactionType,
          description: data.description,
          debitAmount: data.debitAmount,
          creditAmount: data.creditAmount,
          balance: data.balance,
          accountName: data.accountName,
          accountNumber: data.accountNumber,
          sortCode: data.sortCode,
          vatNumber: data.vatNumber,
          merchantAddress: data.merchantAddress,
          paymentMethod: data.paymentMethod,
          subtotal: data.subtotal,
          receiptTime: data.receiptTime,
          rawText: data.rawText,
          pageNumber: data.pageNumber,
        }));
        expandRow(row.id, newRows);
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
        // Vision assist only makes sense for an actual image — a PDF row has no single rendered
        // page to send here (the OCR route rasterizes PDF pages server-side and doesn't keep the
        // result), so this silently falls back to text-only classification for those regardless
        // of the setting, same as the route itself does if imageDataUrl is omitted.
        const wantsVision = settings.visionClassifyAssist && row.file.type !== "application/pdf";
        const imageDataUrl = wantsVision ? await fileToDataURL(row.file).catch(() => null) : null;
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
            useVisionAssist: settings.visionClassifyAssist,
            imageDataUrl,
          }),
        });
        const json = await parseApiResponse(res);
        if (!res.ok || !json.success) {
          throw new Error(json.error || "Classification failed");
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
      "receiptTime",
      "totalAmount",
      "subtotal",
      "currency",
      "vatAmount",
      "vatNumber",
      "paymentMethod",
      "merchantAddress",
      "transactionType",
      "description",
      "debitAmount",
      "creditAmount",
      "balance",
      "accountName",
      "accountNumber",
      "sortCode",
      "pageNumber",
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
    const csv = "﻿" + lines.join("\n"); // BOM so Excel opens the file as UTF-8
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
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
        <img src="/demo-accorix-logo.svg" alt="demo-Accorix" className="app-logo" />
        <h1 className="app-title">POC — Invoice &amp; Receipt Extraction and Classification</h1>
        <p className="app-subtitle">
          Step 1: OCR via Tesseract.js (local) + field extraction via OpenRouter &nbsp;|&nbsp; Step 2:
          Classification via OpenRouter (free)
        </p>
      </header>

      <div className="upload-row">
        <label className="upload-label" htmlFor={fileInputId}>
          <span>Select invoice/receipt files</span>
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
          Images (jpg, png, …) or PDF — multi-page PDFs and pages with multiple receipts are each
          split into separate rows automatically
        </span>
      </div>

      <div className="toolbar">
        <button className="btn btn-primary" onClick={runOCR} disabled={busy || pendingCount === 0}>
          Step 1: Extract (OCR) — {pendingCount} queued
        </button>
        <button className="btn btn-primary" onClick={runClassify} disabled={busy || ocrDoneCount === 0}>
          Step 2: Classify — {ocrDoneCount} ready
        </button>
        <button className="btn" onClick={exportCSV} disabled={rows.length === 0}>
          Export CSV
        </button>
        <button className="btn" onClick={() => setCategoriesOpen(true)}>
          Categories ({categories.length})
        </button>
        <button className="btn" onClick={() => setSettingsOpen(true)}>
          Settings
        </button>
        <button className="btn" onClick={() => setAboutOpen(true)}>
          About
        </button>
        <button className="btn" onClick={() => setHelpOpen(true)}>
          Help
        </button>
      </div>

      <h2 className="visually-hidden">Invoice processing results</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>File</th>
              <th>Status</th>
              <th>Vendor</th>
              <th>Date</th>
              <th>Total</th>
              <th>Currency</th>
              <th>Category</th>
              <th>Confidence</th>
              <th>Details</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody aria-live="polite">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="cell-truncate" title={r.filename}>
                  {r.filename}
                  {r.sourceLabel && <div className="cell-sublabel">{r.sourceLabel}</div>}
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
                    View
                  </button>
                </td>
                <td>
                  {r.error && (
                    <button className="btn btn-small btn-danger" onClick={() => setSelectedRowId(r.id)}>
                      Show Error
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr className="empty-row">
                <td colSpan={10}>No files uploaded yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <dialog
        ref={detailDialogRef}
        className="detail-dialog"
        onClose={() => setSelectedRowId(null)}
        onClick={closeDialogOnBackdropClick}
        aria-labelledby="detail-dialog-title"
      >
        {selectedRow && (
          <div className="dialog-body">
            <div className="dialog-header">
              <h2 id="detail-dialog-title" className="dialog-title">
                {selectedRow.filename}
                {selectedRow.sourceLabel ? ` — ${selectedRow.sourceLabel}` : ""}
              </h2>
              <button
                className="btn btn-icon"
                aria-label="Close dialog"
                onClick={() => detailDialogRef.current?.close()}
              >
                ×
              </button>
            </div>
            {selectedRow.error && (
              <div className="dialog-error-banner" role="alert">
                <strong>Error:</strong> {selectedRow.error}
              </div>
            )}
            <div className="dialog-content">
              <div className="dialog-image-panel">
                <div
                  ref={imageWrapRef}
                  className={`dialog-image-wrap${previewZoom > 1 ? " dialog-image-wrap-zoomed" : ""}`}
                  onMouseDown={handleImageWrapMouseDown}
                  onMouseMove={handleImageWrapMouseMove}
                  onMouseUp={endImageWrapDrag}
                  onMouseLeave={endImageWrapDrag}
                >
                  {previewUrl && selectedRow.file.type === "application/pdf" ? (
                    <iframe
                      src={`${previewUrl}${selectedRow.pageNumber ? `#page=${selectedRow.pageNumber}` : ""}`}
                      title={`PDF preview for ${selectedRow.filename}`}
                      className="dialog-image dialog-pdf-frame"
                    />
                  ) : previewUrl ? (
                    <img
                      src={previewUrl}
                      alt={`Receipt image for ${selectedRow.filename}`}
                      className="dialog-image"
                      style={previewZoom > 1 ? { width: `${previewZoom * 100}%`, maxWidth: "none" } : undefined}
                      draggable={false}
                      onDragStart={(e) => e.preventDefault()}
                      onMouseMove={handleImageMouseMove}
                      onMouseLeave={handleImageMouseLeave}
                    />
                  ) : (
                    <div className="dialog-image-placeholder">Preview not available</div>
                  )}
                </div>
                {previewUrl && selectedRow.file.type !== "application/pdf" && (
                  <>
                    <div className="dialog-zoom-toolbar">
                      <button
                        type="button"
                        className="btn btn-small"
                        aria-label="Zoom out"
                        onClick={() => setPreviewZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                        disabled={previewZoom <= 0.5}
                      >
                        −
                      </button>
                      <span className="dialog-zoom-level">{Math.round(previewZoom * 100)}%</span>
                      <button
                        type="button"
                        className="btn btn-small"
                        aria-label="Zoom in"
                        onClick={() => setPreviewZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))}
                        disabled={previewZoom >= 4}
                      >
                        +
                      </button>
                      {previewZoom !== 1 && (
                        <button type="button" className="btn btn-small" onClick={() => setPreviewZoom(1)}>
                          Reset
                        </button>
                      )}
                    </div>
                    <p className="dialog-zoom-hint">
                      {previewZoom === 1 ? "Hover the image to magnify" : "Drag the image to pan around"}
                    </p>
                  </>
                )}
              </div>
              {magnifier && (
                <div
                  className="dialog-magnifier"
                  style={{
                    left: magnifier.x - MAGNIFIER_SIZE / 2,
                    top: magnifier.y - MAGNIFIER_SIZE / 2,
                    width: MAGNIFIER_SIZE,
                    height: MAGNIFIER_SIZE,
                    backgroundImage: `url(${previewUrl})`,
                    backgroundSize: `${magnifier.bgWidth}px ${magnifier.bgHeight}px`,
                    backgroundPosition: `${magnifier.bgX}px ${magnifier.bgY}px`,
                  }}
                />
              )}
              <dl className="detail-list dialog-fields-panel">
                <div className="detail-row">
                  <dt>Status</dt>
                  <dd>
                    <span className={`status-badge status-${selectedRow.status}`}>
                      {STATUS_LABELS[selectedRow.status]}
                    </span>
                  </dd>
                </div>
                {EDITABLE_STATUSES.includes(selectedRow.status) && (
                  <p className="app-subtitle detail-edit-hint">
                    Fields are editable — fill in anything OCR missed before running Step 2 for more
                    accurate classification.
                  </p>
                )}
                {DETAIL_FIELDS.map((f) => {
                  const canEdit = f.editable !== false && EDITABLE_STATUSES.includes(selectedRow.status);
                  const value = selectedRow[f.key];
                  const isEmpty = value === undefined || value === null || value === "";
                  return (
                    <div className={`detail-row${canEdit ? " detail-row-editable" : ""}`} key={f.key}>
                      <dt>{f.label}</dt>
                      <dd className={f.numeric ? "cell-num" : undefined}>
                        {canEdit ? (
                          <input
                            type={f.numeric ? "number" : "text"}
                            className={`detail-input${isEmpty ? " detail-input-empty" : ""}`}
                            value={value === undefined || value === null ? "" : String(value)}
                            placeholder="Not extracted — fill in manually"
                            onChange={(e) =>
                              handleDetailFieldChange(selectedRow.id, f.key, f.numeric, e.target.value)
                            }
                          />
                        ) : (
                          formatDetailValue(f.key, value)
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          </div>
        )}
      </dialog>

      <dialog
        ref={categoriesDialogRef}
        className="categories-dialog"
        onClose={() => setCategoriesOpen(false)}
        onClick={closeDialogOnBackdropClick}
        aria-labelledby="categories-dialog-title"
      >
        <div className="dialog-body">
          <div className="dialog-header">
            <h2 id="categories-dialog-title" className="dialog-title">
              Manage Categories
            </h2>
            <button
              className="btn btn-icon"
              aria-label="Close dialog"
              onClick={() => categoriesDialogRef.current?.close()}
            >
              ×
            </button>
          </div>
          <div className="dialog-content dialog-content-stack">
            <p className="app-subtitle">
              These categories are suggested to the model in Step 2 (Classification) and saved in this
              browser.
            </p>
            <ul className="category-chip-list">
              {categories.map((c) => (
                <li key={c} className="category-chip">
                  <span>{c}</span>
                  <button
                    type="button"
                    className="chip-remove"
                    aria-label={`Remove category "${c}"`}
                    onClick={() => removeCategory(c)}
                  >
                    ×
                  </button>
                </li>
              ))}
              {categories.length === 0 && <li className="app-subtitle">No categories defined</li>}
            </ul>
            <form className="category-add-form" onSubmit={addCategory}>
              <label htmlFor={newCategoryId} className="visually-hidden">
                New category
              </label>
              <input
                id={newCategoryId}
                name="newCategory"
                type="text"
                autoComplete="off"
                placeholder="e.g. Office Supplies…"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" disabled={!newCategory.trim()}>
                Add
              </button>
            </form>
            <button type="button" className="btn btn-ghost-danger" onClick={resetCategories}>
              Reset to default categories
            </button>
          </div>
        </div>
      </dialog>

      <dialog
        ref={settingsDialogRef}
        className="categories-dialog"
        onClose={() => setSettingsOpen(false)}
        onClick={closeDialogOnBackdropClick}
        aria-labelledby="settings-dialog-title"
      >
        <div className="dialog-body">
          <div className="dialog-header">
            <h2 id="settings-dialog-title" className="dialog-title">
              Settings
            </h2>
            <button
              className="btn btn-icon"
              aria-label="Close dialog"
              onClick={() => settingsDialogRef.current?.close()}
            >
              ×
            </button>
          </div>
          <div className="dialog-content dialog-content-stack">
            <p className="app-subtitle">
              Both settings are off by default — each adds an extra AI vision-model call on top of
              the normal pipeline, which increases processing time and can hit OpenRouter's free-tier
              rate limits sooner.
            </p>
            <div className="settings-row">
              <label className="toggle-switch" htmlFor="vision-ocr-toggle">
                <input
                  id="vision-ocr-toggle"
                  type="checkbox"
                  checked={settings.visionOcrAssist}
                  onChange={(e) => setSettings((s) => ({ ...s, visionOcrAssist: e.target.checked }))}
                />
                <span className="toggle-track" aria-hidden="true">
                  <span className="toggle-thumb" />
                </span>
              </label>
              <div className="settings-row-text">
                <label htmlFor="vision-ocr-toggle" className="settings-row-title">
                  AI vision assist for OCR (Step 1)
                </label>
                <p className="settings-row-desc">
                  Adds a vision-capable AI model reading the image directly as a third OCR source,
                  combined with the two Tesseract passes rather than replacing them — the field
                  extraction step cross-references all sources instead of picking one.
                </p>
              </div>
            </div>
            <div className="settings-row">
              <label className="toggle-switch" htmlFor="vision-classify-toggle">
                <input
                  id="vision-classify-toggle"
                  type="checkbox"
                  checked={settings.visionClassifyAssist}
                  onChange={(e) => setSettings((s) => ({ ...s, visionClassifyAssist: e.target.checked }))}
                />
                <span className="toggle-track" aria-hidden="true">
                  <span className="toggle-thumb" />
                </span>
              </label>
              <div className="settings-row-text">
                <label htmlFor="vision-classify-toggle" className="settings-row-title">
                  AI vision assist for Classification (Step 2)
                </label>
                <p className="settings-row-desc">
                  Sends the receipt/invoice image itself alongside the extracted fields when
                  classifying, so a visible logo, letterhead, or layout can help pick a category the
                  text alone left ambiguous. Image files only — PDF rows always classify from text.
                </p>
              </div>
            </div>
          </div>
        </div>
      </dialog>

      <dialog
        ref={aboutDialogRef}
        className="about-dialog"
        onClose={() => setAboutOpen(false)}
        onClick={closeDialogOnBackdropClick}
        aria-labelledby="about-dialog-title"
      >
        <div className="dialog-body">
          <div className="dialog-header">
            <h2 id="about-dialog-title" className="dialog-title">
              About Accorix
            </h2>
            <button
              className="btn btn-icon"
              aria-label="Close dialog"
              onClick={() => aboutDialogRef.current?.close()}
            >
              ×
            </button>
          </div>
          <div className="dialog-content dialog-content-stack about-dialog-content">
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset, no benefit from next/image here */}
            <img src="/accorix-logo.svg" alt="Accorix" className="about-logo" />
            <p className="about-tagline">The Smarter Accounting Assistant</p>
            <p>
              What you're using right now is a <strong>feasibility demo</strong> of Phase 1 of
              Accorix — a cloud accounting platform built for firms who manage many clients at once.
              It proves out whether free/local OCR plus an LLM can reliably turn a messy real-world
              document into structured, categorised data.
            </p>
            <p>
              The full product is a direct replacement for Xero/QuickBooks, not a bolt-on OCR tool —
              AI is woven in from the first uploaded receipt through to the filed VAT return, with an
              accountant always the one who signs off on anything that matters.
            </p>
            <p>
              It's built for accounting firms and bookkeeping practices in the UK managing multiple
              clients, so each client's books get done faster and with fewer manual errors.
            </p>
            <Link href="/vision" target="_blank" rel="noopener noreferrer" className="btn btn-primary about-cta">
              See the Full Product Vision →
            </Link>
          </div>
        </div>
      </dialog>

      <dialog
        ref={helpDialogRef}
        className="help-dialog"
        onClose={() => setHelpOpen(false)}
        onClick={closeDialogOnBackdropClick}
        aria-labelledby="help-dialog-title"
      >
        <div className="dialog-body">
          <div className="dialog-header">
            <h2 id="help-dialog-title" className="dialog-title">
              How This Works
            </h2>
            <button
              className="btn btn-icon"
              aria-label="Close dialog"
              onClick={() => helpDialogRef.current?.close()}
            >
              ×
            </button>
          </div>
          <div className="dialog-content dialog-content-stack">
            <p className="help-callout">
              This is a <strong>feasibility demo</strong> of Phase 1 of a larger product, Accorix —
              it proves out whether free/local OCR plus an LLM can reliably turn a messy real-world
              document into structured, categorised data, before the full multi-tenant platform gets
              built around it.
            </p>
            <ol className="help-steps">
              <li>
                <strong>Upload files.</strong> Add one or more invoice/receipt images (jpg, png, …) or
                PDFs. Each page of a PDF is OCR'd separately, and if a page contains more than one
                receipt they're split into separate result rows automatically.
              </li>
              <li>
                <strong>Step 1 — Extract (OCR).</strong> Runs Tesseract.js locally to read the text (PDF
                pages are rendered to images first), then an AI model (via OpenRouter) turns that text
                into structured fields — vendor, amounts, VAT, dates, UK receipt details, or
                bank-statement fields, depending on what's on the document.
              </li>
              <li>
                <strong>View details.</strong> Click "View" on any row to see the full extracted field set
                next to the original image.
              </li>
              <li>
                <strong>Step 2 — Classify.</strong> An AI model assigns each row a spending category from
                your category list.
              </li>
              <li>
                <strong>Categories.</strong> Add or remove categories any time — changes are saved in this
                browser and used for future classification runs.
              </li>
              <li>
                <strong>Settings.</strong> Two off-by-default toggles that add an AI vision model
                reading the image directly — one for OCR, one for Classification — for extra accuracy
                at the cost of extra processing time and free-tier rate-limit pressure.
              </li>
              <li>
                <strong>Export CSV.</strong> Download all results as a spreadsheet.
              </li>
            </ol>
            <p className="app-subtitle">
              This is a feasibility proof-of-concept — OCR and classification accuracy will vary by
              document quality and the free model in use.
            </p>
            <p className="app-subtitle">
              Curious what the finished product looks like? Click <strong>About</strong> in the
              toolbar for a quick summary, or open the <strong>Full Product Vision</strong> page from
              there for the complete roadmap.
            </p>
          </div>
        </div>
      </dialog>
    </main>
  );
}
