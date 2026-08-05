import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "demo-Accorix",
  description: "Feasibility demo of Accorix's OCR + AI categorisation engine — see /vision for the full product.",
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
    <html lang="en" dir="ltr">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        {children}
        <footer className="app-footer">
          <span>
            Built by{" "}
            <a href="https://github.com/mahdi-kh1" target="_blank" rel="noopener noreferrer">
              Mahdi Khodaei
            </a>
          </span>
          <span aria-hidden="true">·</span>
          <a href="mailto:mikhodaee@gmail.com">mikhodaee@gmail.com</a>
        </footer>
      </body>
    </html>
  );
}
