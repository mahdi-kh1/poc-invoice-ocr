export const metadata = {
  title: "Invoice OCR POC",
  description: "POC تست کیفیت OCR و دسته‌بندی فاکتور",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
