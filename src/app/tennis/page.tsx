import type { Metadata } from "next";
import { SportHomePage } from "../SportHomePage";

const title = "한국 테니스장 예약 정보 | Courts Korea";
const description =
  "전국 테니스장의 위치, 예약 방법과 오픈 시간, 이용 대상 및 이용 정보를 확인하세요.";
const url = "https://courtskorea.com/tennis";

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

export default function TennisHomePage() {
  return <SportHomePage sportType="tennis" />;
}
