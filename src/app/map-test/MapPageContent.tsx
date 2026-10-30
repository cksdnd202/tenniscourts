import { getCachedMapCourts } from "@/lib/mapCourtData.server";
import type { Court } from "../types";
import { MapTestClient } from "./MapTestClient";

type MapPageContentProps = {
  sportType?: "tennis" | "badminton";
};

export async function MapPageContent({ sportType }: MapPageContentProps = {}) {
  let courts: Court[];
  try {
    courts = await getCachedMapCourts(sportType);
  } catch (error) {
    return (
      <main className="min-h-screen bg-black p-6 text-white">
        <p className="rounded-lg border border-red-900 bg-red-950/30 p-4 text-sm text-red-200">
          코트 지도 데이터를 불러오지 못했습니다: {error instanceof Error ? error.message : "알 수 없는 오류"}
        </p>
      </main>
    );
  }
  return <MapTestClient courts={courts} initialSportType={sportType} />;
}
