import type { Metadata } from "next";
import { MapPageContent } from "../map-test/MapPageContent";

export const revalidate = 60;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ courtId?: string; nearbyCourtId?: string }>;
}): Promise<Metadata> {
  const { courtId, nearbyCourtId } = await searchParams;
  const isFocusedVariant = Boolean(courtId || nearbyCourtId);

  return {
    title: "코트 지도 | Courts Korea",
    description: "전국 테니스장과 배드민턴장을 지도에서 검색하고 예약 오픈 정보를 확인하세요.",
    alternates: {
      canonical: "https://courtskorea.com/map",
    },
    ...(isFocusedVariant ? { robots: { index: false, follow: true } } : {}),
  };
}

export default function MapPage() {
  return <MapPageContent />;
}
