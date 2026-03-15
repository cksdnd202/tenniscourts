import { supabase } from "@/lib/supabase";
import type { Court } from "../../types";
import { CourtSearchHeader } from "../../CourtSearchHeader";
import { CourtDetailBookingSection } from "../../detail/CourtDetailBookingSection";
import { CourtDetailAddress, CourtDetailTable, CourtDetailMap } from "../../detail/CourtDetailCommon";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CourtDetailPage({ params }: PageProps) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("courtinfo")
    .select(
      "id, use_or_not, basic_court_name, basic_owner_type, basic_address, basic_region, basic_city, time_of_use_same, basic_time_of_use_weekend_from, basic_time_of_use_weekend_to, basic_time_of_use_weekday_from, basic_time_of_use_weekday_to, booking_site_link, booking_reception_time, booking_rule_type, booking_open_type, booking_eligibility_first, booking_eligibility_second, booking_open_day_of_month, booking_open_day_of_week, booking_open_ordinal, booking_open_day_owner, booking_open_time_owner, booking_open_day_normal, booking_open_time_normal, booking_normal_iscurrentmonth, booking_open_offset, court_count_hard_indoor, court_count_hard_outdoor, court_count_grass_indoor, court_count_grass_outdoor, court_count_clay_indoor, court_count_clay_outdoor, basic_map_link, booking_booking_provide, etc_desc"
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
        <p className="text-sm text-gray-600">주소 표시줄의 주소를 다시 한 번 확인해 주세요.</p>
      </main>
    );
  }

  return (
    <>
      {/* 1. 헤더: 메인화면과 동일 */}
      <CourtSearchHeader courts={[court]} />

      <main className="pt-[73px] min-h-screen bg-[#000000]">
        <div className="mx-auto max-w-4xl px-6 py-8">
          {/* 1. basic_court_name, basic_owner_type, 코트정보 알려주기 배너, 예약하러가기 */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <h1 className="text-xl font-bold text-white truncate">
                {court.basic_court_name ?? "(이름 없음)"}
              </h1>
              <span className="rounded text-xs font-medium text-white pt-1 pb-1 pl-1.5 pr-1.5 bg-[#2C2C2C] flex-shrink-0 whitespace-nowrap">
                {court.basic_owner_type ?? ""}
              </span>
              <a
                href="/"
                className="flex items-center gap-1.5 rounded-lg bg-[#2C2C2C] px-3 py-2 text-sm text-[#B0B0B0] hover:bg-[#333333] transition flex-shrink-0"
              >
                <span className="text-[#E6B800]">●</span>
                <span>나만 아는 코트가 있으신가요?</span>
                <span className="font-medium text-white">코트 정보 알려주기</span>
                <span className="text-white">→</span>
              </a>
            </div>
            {court.booking_site_link && (
              <a
                href={court.booking_site_link}
                target="_blank"
                rel="noopener noreferrer"
                data-gtm="reserve_click"
                data-court-id={court.id}
                data-court-name={court.basic_court_name}
                className="flex-shrink-0 flex items-center justify-center px-5 py-2.5 rounded-lg bg-[#2C8B56] text-white font-medium hover:bg-[#53A978] transition"
              >
                예약하러가기
              </a>
            )}
          </div>

          {/* 2. ruleType별 코트 오픈 시간 */}
          <section className="mb-6">
            <CourtDetailBookingSection court={court} />
          </section>

          {/* 3. basic_address */}
          <section className="mb-6">
            <CourtDetailAddress court={court} />
          </section>

          {/* 4. 네이버 지도 API (나중에 개발할 부분, 현재 빈칸) */}
          <section className="mb-6">
            <CourtDetailMap court={court} />
          </section>

          {/* 5. 코트 종류 정보 */}
          <section className="mb-6">
            <h2 className="text-white font-semibold mb-2">코트</h2>
            <CourtDetailTable court={court} />
          </section>

          {/* 6. 부가 정보 (etc_desc) */}
          <section>
            <h2 className="text-white font-semibold mb-2">부가 정보</h2>
            <div className="text-[#B0B0B0] text-sm whitespace-pre-wrap">
              {court.etc_desc != null && court.etc_desc.trim() !== "" ? court.etc_desc : "등록된 부가 정보가 없습니다."}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
