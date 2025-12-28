import { supabase } from "@/lib/supabase";
import { CourtFilter } from "./CourtFilter";

// DB 레코드 타입 정의(테이블 컬럼만 적당히)
type Court = {
  id: string;
  court_name: string | null;
  owner_type: string | null;
  address: string | null;
  map_link: string | null;
  region: string | null;
  city: string | null;
  opentime_owner: string | null;
  opentime_normal: string | null;
  reservation_time: string | null;
  time_of_use: string | null;
  court_count_hard_indoor: number | null;
  court_count_hard_outdoor: number | null;
  court_count_grass_indoor: number | null;
  court_count_grass_outdoor: number | null;
  court_count_clay_indoor: number | null;
  court_count_clay_outdoor: number | null;
  reserve_link: string | null;
  
};

export default async function Home() {
  // 타입 지정
  const { data, error } = await supabase
    .from("courtinfo")
    .select("id, court_name, owner_type, address, region, city, opentime_owner, opentime_normal, court_count_hard_indoor, court_count_hard_outdoor, court_count_grass_indoor, court_count_grass_outdoor, court_count_clay_indoor, court_count_clay_outdoor, reserve_link, map_link")
    .order("court_name", { ascending: true })
    .limit(50);
  
  const typedData = data as Court[] | null;

  if (error) {
    return (
      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">🎾 Ground Korea</h1>
        <p className="text-red-8600">에러: {error.message}</p>
      </main>
    );
  }

  const list = typedData ?? []; // 안전하게 기본값

  // 디버깅: opentime_normal 데이터 확인
  if (list.length > 0) {
    console.log("첫 번째 코트 데이터:", list[0]);
    console.log("opentime_normal 값:", list[0]?.opentime_normal);
  }

  return (
    <main className="w-auto mx-auto h-max">
      <CourtFilter courts={list} />
    </main>
  );
}
