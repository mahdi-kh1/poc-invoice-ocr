export type RowStatus =
  | "pending"
  | "ocr_running"
  | "ocr_done"
  | "ocr_error"
  | "classify_running"
  | "classify_done"
  | "classify_error";

export interface OcrExtractedData {
  vendorName: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  totalAmount: number | null;
  currency: string | null;
  vatAmount: number | null;
  transactionType: string | null;
  description: string | null;
  debitAmount: number | null;
  creditAmount: number | null;
  balance: number | null;
  accountName: string | null;
  accountNumber: string | null;
  sortCode: string | null;
  vatNumber: string | null;
  merchantAddress: string | null;
  paymentMethod: string | null;
  subtotal: number | null;
  receiptTime: string | null;
  rawText: string;
  /** 1-based PDF page this receipt was read from, or null for a plain image upload. */
  pageNumber: number | null;
  /**
   * Set when Tesseract OCR succeeded but every model in the fallback chain failed to extract
   * structured fields (all fields above come back null in that case) — the raw OCR text is still
   * usable and returned rather than failing the whole page, but the client should surface this so
   * the user knows why the fields are empty and can fill them in manually before classifying.
   */
  extractionWarning: string | null;
}

export interface ClassifyResult {
  category: string;
  confidence: number;
}
