import { supabase } from "@/lib/supabase";
import type { Court } from "../../types";

type PageProps = {
  // Next.js 최신 버전에서는 params 가 Promise 로 전달될 수 있음
  params: Promise<{
    id: string;
  }>;
};

export default async function CourtDetailPage({ params }: PageProps) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("courtinfo")
    .select(
      "id, use_or_not, basic_court_name, basic_owner_type, basic_address, basic_region, basic_city, basic_time_of_use, booking_site_link, booking_reception_time, booking_rule_type, booking_open_type, booking_eligibility_first, booking_eligibility_second, booking_open_day_of_month, booking_open_day_of_week, booking_open_day_owner, booking_open_time_owner, booking_open_day_normal, booking_open_time_normal, booking_open_offset, court_count_hard_indoor, court_count_hard_outdoor, court_count_grass_indoor, court_count_grass_outdoor, court_count_clay_indoor, court_count_clay_outdoor, basic_map_link, booking_booking_provide"
    )
    .eq("id", id)
    .maybeSingle();

  const court = data as Court | null;

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-4 text-2xl font-bold">코트 정보를 불러오는 중 오류가 발생했습니다.</h1>
        <p className="text-sm text-red-600">{error.message}</p>
      </main>
    );
  }

  if (!court) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-2 text-2xl font-bold">코트를 찾을 수 없습니다.</h1>
        <p className="text-sm text-gray-600">
          주소 표시줄의 주소를 다시 한 번 확인해 주세요.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8 flex flex-col gap-2 border-b border-gray-200 pb-6">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2C8B56]">
          GROUND KOREA
        </div>
        <h1 className="text-2xl font-bold text-zinc-900">
          {court.basic_court_name}
        </h1>
        <p className="text-sm text-gray-600">
          {court.basic_region} {court.basic_city} {court.basic_address}
        </p>
        <p className="text-xs text-gray-500">
          운영 구분: {court.basic_owner_type ?? "정보 없음"}
        </p>
      </header>
    </main>
  );
}

