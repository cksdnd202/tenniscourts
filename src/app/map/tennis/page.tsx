import type { Metadata } from "next";
import { MapPageContent } from "../../map-test/MapPageContent";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "테니스장 지도 | Courts Korea",
  description: "전국 테니스장을 지도에서 검색하고 예약 오픈 정보를 확인하세요.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function TennisMapPage() {
  return <MapPageContent sportType="tennis" />;
}
