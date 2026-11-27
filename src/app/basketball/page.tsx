import type { Metadata } from "next";
import { SportHomePage } from "../SportHomePage";

const title = "전국 농구장 예약·자유이용 정보 | Courts Korea";
const description =
  "전국 실내·실외 농구장의 위치, 예약 방법과 오픈 시간, 예약 없이 자유이용 가능한 시설 및 이용 대상을 확인하세요.";
const url = "https://courtskorea.com/basketball";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  openGraph: {
    title,
    description,
    url,
    type: "website",
    siteName: "Courts Korea",
    locale: "ko_KR",
    images: ["/courtskroea_ogimg.png?v=20260323-1"],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/courtskroea_ogimg.png?v=20260323-1"],
  },
};

export default function BasketballHomePage() {
  return <SportHomePage sportType="basketball" />;
}
