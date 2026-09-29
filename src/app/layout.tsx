import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistem Laboratuvarı",
  description: "Sistem analizi için canlı ve etkileşimli öğrenme platformu.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body><div className="app-shell">{children}</div></body>
    </html>
  );
}
