import type { Metadata } from "next";
import MapPage from "../map-test/page";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "테니스장 지도 | Courts Korea",
  description: "전국 테니스장을 지도에서 검색하고 예약 오픈 정보를 확인하세요.",
  alternates: {
    canonical: "https://courtskorea.com/map",
  },
};

export default MapPage;
