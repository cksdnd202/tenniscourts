import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { SportHomePage } from "./SportHomePage";

const title = "전국 스포츠 시설 예약 정보 | Courts Korea";
const description =
  "전국 테니스장과 배드민턴장의 위치, 예약 방법과 오픈 시간, 이용 정보를 한곳에서 확인하세요.";
const url = "https://courtskorea.com/";

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

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string }>;
}) {
  const requestedSport = (await searchParams).sport;

  if (requestedSport === "tennis" || requestedSport === "badminton") {
    permanentRedirect(`/${requestedSport}`);
  }

  return <SportHomePage sportType="tennis" isBrandHome />;
}
