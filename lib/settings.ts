export interface AppSettings {
  /** Adds a vision-capable AI model reading the image directly as a third OCR source, combined
   * with the two Tesseract passes. Opt-in: extra latency, extra free-tier rate-limit pressure. */
  visionOcrAssist: boolean;
  /** Sends the receipt/invoice image to a vision-capable model alongside the extracted fields when
   * classifying, so visual cues (logo, letterhead, layout) can help pick a category. Image-only —
   * PDF rows fall back to text-only classification regardless of this setting. */
  visionClassifyAssist: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  visionOcrAssist: false,
  visionClassifyAssist: false,
};

export const SETTINGS_STORAGE_KEY = "invoice-ocr-poc:settings";
