import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "BI SETBAY | Dashboard Analisis Setoran & Bayaran Bank Indonesia",
  description: "Executive Business Intelligence Dashboard untuk analisis transaksi riil SETBAY MANADO dan SETBAY KASTIP.",
  icons: {
    icon: "/logo-bi.png",
    shortcut: "/logo-bi.png",
    apple: "/logo-bi.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={fontSans.variable}>
      <body className={fontSans.className}>{children}</body>
    </html>
  );
}
