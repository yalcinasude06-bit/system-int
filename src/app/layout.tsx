import type { Metadata } from "next";
import { I18nProvider } from "@/lib/i18n/I18nContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistem Laboratuvarı",
  description: "Sistem analizi için canlı ve etkileşimli öğrenme platformu.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body><I18nProvider><div className="app-shell">{children}</div></I18nProvider></body>
    </html>
  );
}
