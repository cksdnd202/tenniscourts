import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { pretendard } from "./fonts";

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
            })(window,document,'script','dataLayer','GTM-NSKRJJRG');
          `}
        </Script>
        <title>한국 테니스장 예약 정보 | Courts Korea</title>
        <meta name="description" content="한국에 있는 모든 테니스장의 예약 정보를 제공합니다." />
        {/* Open Graph */}
        <meta property="og:title" content="한국 테니스장 예약 정보 | Courts Korea" />
        <meta property="og:description" content="한국에 있는 모든 테니스장의 예약 정보를 제공합니다." />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:url" content="https://courtskorea.com" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Courts Korea" />
        <meta property="og:locale" content="ko_KR" />
        <meta property="og:locale:alternate" content="en_US" />
        {/* Twitter Cards */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="한국 테니스장 예약 정보 | Courts Korea" />
        <meta name="twitter:description" content="한국에 있는 모든 테니스장의 예약 정보를 제공합니다." />
        <meta name="twitter:image" content="/og-image.png" />
        <meta name="twitter:url" content="https://courtskorea.com" />
        <meta name="twitter:site" content="@courtskorea" />
        <meta name="twitter:creator" content="@courtskorea" />
        <meta name="twitter:domain" content="courtskorea.com" />
        <meta name="robots" content="index, follow" />
      </head>
      <body className="font-sans">
        {/* ✅ GTM - body 바로 뒤 (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-NSKRJURG"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {children}

      </body>
    </html>
  );
}
