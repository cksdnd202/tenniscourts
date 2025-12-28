import type { Metadata } from "next";
import "./globals.css";
import { pretendard } from "./fonts";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <body className="font-sans h-full bg-gray-100 min-h-screen">{children}</body>
    </html>
  );
}
