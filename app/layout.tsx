import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Invoice OCR POC",
  description: "POC تست کیفیت OCR و دسته‌بندی فاکتور",
};

export const viewport: Viewport = {
  themeColor: "#0a0e17",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <a href="#main-content" className="skip-link">
          پرش به محتوای اصلی
        </a>
        {children}
      </body>
    </html>
  );
}
