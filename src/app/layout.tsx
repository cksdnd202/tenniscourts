import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { pretendard } from "./fonts";
import { ServiceOnboarding } from "./ServiceOnboarding";

const siteUrl = "https://courtskorea.com";
const ogImage = "/courtskroea_ogimg.png?v=20260323-1";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "한국 테니스장 예약 정보 | Courts Korea",
  description: "한국에 있는 모든 테니스장의 예약 정보를 제공합니다.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/courtskorea_favicon_16px.png", sizes: "16x16", type: "image/png" },
      { url: "/courtskorea_favicon_32px.png", sizes: "32x32", type: "image/png" },
      { url: "/courtskorea_favicon_48px.png", sizes: "48x48", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/courtskorea_favicon.png",
  },
  openGraph: {
    title: "한국 테니스장 예약 정보 | Courts Korea",
    description: "한국에 있는 모든 테니스장의 예약 정보를 제공합니다.",
    url: "https://courtskorea.com",
    type: "website",
    siteName: "Courts Korea",
    locale: "ko_KR",
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "한국 테니스장 예약 정보 | Courts Korea",
    description: "한국에 있는 모든 테니스장의 예약 정보를 제공합니다.",
    images: [ogImage],
    site: "@courtskorea",
    creator: "@courtskorea",
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "BCvgKsC4cHEm8CeU6SNVtcLPLpIty34oHCOBDiwNGf4",
    other: {
      "naver-site-verification": "5f1d0a2fa3678798eda0f3feb39991b7b9e7e56d",
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <head>
        {/* ✅ GTM - head 영역 */}
        <Script id="gtm-head" strategy="beforeInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-KWD6528D');
          `}
        </Script>
      </head>
      <body className="font-sans">
        {/* ✅ GTM - body 바로 뒤 (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-KWD6528D"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {children}
        <ServiceOnboarding />

      </body>
    </html>
  );
}
