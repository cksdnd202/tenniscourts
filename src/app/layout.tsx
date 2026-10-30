import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { pretendard } from "./fonts";
import { PostHogProvider } from "./PostHogProvider";
import { ServiceOnboarding } from "./ServiceOnboarding";

const siteUrl = "https://courtskorea.com";
const ogImage = "/courtskroea_ogimg.png?v=20260323-1";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "전국 스포츠 시설 예약 정보 | Courts Korea",
  description: "전국 테니스장과 배드민턴장의 위치, 예약 방법과 오픈 시간, 이용 정보를 한곳에서 확인하세요.",
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
    title: "전국 스포츠 시설 예약 정보 | Courts Korea",
    description: "전국 테니스장과 배드민턴장의 위치, 예약 방법과 오픈 시간, 이용 정보를 한곳에서 확인하세요.",
    url: "https://courtskorea.com",
    type: "website",
    siteName: "Courts Korea",
    locale: "ko_KR",
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "전국 스포츠 시설 예약 정보 | Courts Korea",
    description: "전국 테니스장과 배드민턴장의 위치, 예약 방법과 오픈 시간, 이용 정보를 한곳에서 확인하세요.",
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
            if (!/CourtsKoreaApp/i.test(window.navigator.userAgent)) {
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-KWD6528D');
            }
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
        <PostHogProvider>
          {children}
          <ServiceOnboarding />
        </PostHogProvider>

      </body>
    </html>
  );
}
