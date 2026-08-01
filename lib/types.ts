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
  rawText: string;
}

export interface ClassifyResult {
  category: string;
  confidence: number;
}
