import { LocaleProvider } from "./_lib/i18n";

export default function PreviewRootLayout({ children }: { children: React.ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}
