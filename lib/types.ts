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
}

export interface ClassifyResult {
  category: string;
  confidence: number;
}
