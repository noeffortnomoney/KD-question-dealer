import type { Metadata } from "next";
import { Be_Vietnam_Pro, Playfair_Display } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-be-vietnam",
  display: "swap",
});

const brandSerif = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  weight: ["700"],
  variable: "--font-brand-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kymdan — Đào tạo & Thi đại lý",
  description: "Cổng đào tạo và kiểm tra kiến thức cho đại lý Kymdan",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${beVietnam.variable} ${brandSerif.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
