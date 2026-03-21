import { supabase } from "@/lib/supabase";
import type { Court } from "../../types";
import { CourtSearchHeader } from "../../CourtSearchHeader";
import { CourtDetailBookingSection } from "../../detail/CourtDetailBookingSection";
import { CourtDetailAddress, CourtDetailTable, CourtDetailMap } from "../../detail/CourtDetailCommon";
import { CourtDetailAside, CourtDetailMobileBookBar } from "../../detail/CourtDetailAside";

type PageProps = {
  params: Promise<{ id: string }>;
};

function CourtInfoBanner() {
  return (
    <a
      href="/"
      className="flex items-center justify-between gap-2 rounded-xl border border-[#2C2C2C] bg-[#1A1A1B] px-4 py-3 text-sm hover:bg-[#252528] transition min-[1032px]:hidden"
    >
      <span className="flex items-center gap-2 min-w-0 text-[#B0B0B0]">
        <span aria-hidden className="flex-shrink-0">
          🎾
        </span>
        <span className="min-w-0 leading-snug">
          <span className="text-white">나만 아는 코트가 있으신가요?</span>{" "}
          <span className="text-white font-medium">코트 정보 알려주기</span>
        </span>
      </span>
      <span className="text-white flex-shrink-0 text-lg leading-none" aria-hidden>
        ›
      </span>
    </a>
  );
}

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
      <CourtSearchHeader courts={[court]} />

      {/* 헤더 검색창과 동일하게 1032px 이상에서만 2열 + 우측 사이드 표시 (lg=1024만 쓰면 사이드바가 비는 구간 발생) */}
      <main className="pt-[73px] min-h-screen bg-black pb-44 min-[1032px]:pb-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 min-[1032px]:px-8 py-6 min-[1032px]:py-8">
          <div className="min-[1032px]:grid min-[1032px]:grid-cols-12 min-[1032px]:gap-8 min-[1032px]:items-stretch">
            {/* 좌측 메인 (~70–75%) */}
            <div className="min-[1032px]:col-span-8 xl:col-span-9 space-y-6 min-w-0">
              <CourtInfoBanner />

              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">
                    {court.basic_court_name ?? "(이름 없음)"}
                  </h1>
                  {court.basic_owner_type ? (
                    <span className="rounded text-xs font-medium text-white px-2 py-1 bg-[#2C2C2C] flex-shrink-0 whitespace-nowrap">
                      {court.basic_owner_type}
                    </span>
                  ) : null}
                </div>
                <a
                  href="/"
                  className="hidden min-[1032px]:inline-flex items-center gap-1.5 rounded-xl border border-[#2C2C2C] bg-[#1A1A1B] px-4 py-2.5 text-sm text-[#B0B0B0] hover:bg-[#252528] transition flex-shrink-0"
                >
                  <span aria-hidden>🎾</span>
                  <span>
                    나만 아는 코트가 있으신가요?{" "}
                    <span className="text-white font-medium">코트 정보 알려주기</span>
                  </span>
                  <span className="text-white" aria-hidden>
                    ›
                  </span>
                </a>
              </div>

              <section aria-label="예약 오픈 정보">
                <CourtDetailBookingSection court={court} />
              </section>

              <section className="space-y-3">
                <CourtDetailAddress court={court} />
                <CourtDetailMap court={court} />
              </section>

              <section>
                <h2 className="text-white font-semibold mb-3">코트</h2>
                <CourtDetailTable court={court} />
              </section>

              <section>
                <h2 className="text-white font-semibold mb-3">부가 정보</h2>
                <div className="rounded-xl border border-[#2C2C2C] bg-[#1A1A1B] px-4 py-4 text-sm text-[#B0B0B0] whitespace-pre-wrap min-h-[120px]">
                  {court.etc_desc != null && court.etc_desc.trim() !== ""
                    ? court.etc_desc
                    : "등록된 부가 정보가 없습니다."}
                </div>
              </section>
            </div>

            {/* 우측 사이드바 (~25–30%), 1032px 이상만 */}
            <div className="hidden min-[1032px]:block min-[1032px]:col-span-4 xl:col-span-3 min-w-0">
              <CourtDetailAside court={court} />
            </div>
          </div>
        </div>
      </main>

      <CourtDetailMobileBookBar court={court} />
    </>
  );
}
