import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { pretendard } from "./fonts";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://courtskorea.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "한국 테니스장 예약 정보 | Courts Korea",
  description: "한국에 있는 모든 테니스장의 예약 정보를 제공합니다.",
  openGraph: {
    title: "한국 테니스장 예약 정보 | Courts Korea",
    description: "한국에 있는 모든 테니스장의 예약 정보를 제공합니다.",
    url: "https://courtskorea.com",
    type: "website",
    siteName: "Courts Korea",
    locale: "ko_KR",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "한국 테니스장 예약 정보 | Courts Korea",
    description: "한국에 있는 모든 테니스장의 예약 정보를 제공합니다.",
    images: ["/og-image.png"],
    site: "@courtskorea",
    creator: "@courtskorea",
  },
  robots: {
    index: true,
    follow: true,
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
            })(window,document,'script','dataLayer','GTM-NSKRJJRG');
          `}
        </Script>
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
