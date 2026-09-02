import type { Court, CourtBookingRuleFee } from "../types";

function feeEligibilityLabel(eligibility: string | null) {
  if (eligibility === "resident") return "구민";
  if (eligibility === "citizen") return "시민";
  if (eligibility === "inhabitant") return "주민";
  if (eligibility === "non_resident") return "타지역";
  if (eligibility === "normal") return "전체";
  if (eligibility === "none") return "없음";
  return eligibility || "자격 없음";
}

function formatFee(price: number | null) {
  return price === null ? "-" : `${price.toLocaleString("ko-KR")}원`;
}

function formatLightingFee(fee: CourtBookingRuleFee) {
  if (fee.lighting_fee_amount == null) return "조명비 별도";

  const basisHours = fee.lighting_fee_basis_hours ?? fee.price_basis_hours ?? 1;
  const startTime = fee.lighting_start_time?.slice(0, 5);
  return [
    `조명비 ${formatFee(fee.lighting_fee_amount)} / ${basisHours}시간 별도`,
    startTime ? `${startTime} 이후 적용` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function feePriceRows(fee: CourtBookingRuleFee) {
  const rows = [
    {
      label: "실외",
      weekday: fee.outdoor_weekday_price,
      weekend: fee.outdoor_weekend_price,
    },
    {
      label: "실내",
      weekday: fee.indoor_weekday_price,
      weekend: fee.indoor_weekend_price,
    },
  ];

  return rows.filter((row) => row.weekday != null || row.weekend != null);
}

export function CourtFeesSection({ court }: { court: Court }) {
  const feesByRuleId = new Map(
    (court.court_booking_rule_fees ?? []).map((fee) => [fee.booking_rule_id, fee])
  );
  const feeRows = [...(court.court_booking_rules ?? [])]
    .filter((rule) => rule.is_active !== false && feesByRuleId.has(rule.id))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((rule) => ({ rule, fee: feesByRuleId.get(rule.id) as CourtBookingRuleFee }))
    .filter(({ fee }) => fee.is_free || feePriceRows(fee).length > 0);

  if (feeRows.length === 0) return null;

  return (
    <section aria-label="이용요금 정보" className="space-y-3">
      <h2 className="font-semibold text-white">이용요금 정보</h2>
      <div className="grid gap-3">
        {feeRows.map(({ rule, fee }) => {
          const priceRows = feePriceRows(fee);
          return (
            <article
              key={fee.id}
              className="overflow-hidden rounded-xl border border-[#303033] bg-[#18181A]"
            >
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#303033] bg-[#202023] px-4 py-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <h3 className="truncate text-sm font-semibold text-white">
                    {feeEligibilityLabel(rule.eligibility)}
                  </h3>
                  {!fee.is_free ? (
                    <span className="shrink-0 rounded-md bg-[#2B2B2F] px-2 py-1 text-[11px] font-medium text-[#C9C9CE]">
                      {fee.price_basis_hours ?? 1}시간 기준
                    </span>
                  ) : null}
                </div>
                {fee.lighting_fee_separate && !fee.is_free ? (
                  <p className="flex items-center gap-1.5 text-xs font-medium text-[#FBBF66]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#F5A623]" />
                    {formatLightingFee(fee)}
                  </p>
                ) : null}
              </header>

              {fee.is_free ? (
                <div className="px-4 py-5 sm:px-5">
                  <strong className="text-lg font-semibold text-white">무료</strong>
                </div>
              ) : (
                <div>
                  <div className="hidden grid-cols-[minmax(64px,0.65fr)_minmax(110px,1fr)_minmax(110px,1fr)] gap-4 border-b border-[#303033] px-4 py-2.5 text-xs font-medium text-[#8F8F95] sm:grid sm:px-5">
                    <span>코트</span>
                    <span className="text-right">평일</span>
                    <span className="text-right">주말·공휴일</span>
                  </div>
                  <div className="divide-y divide-[#303033]">
                    {priceRows.map((priceRow) => (
                      <div
                        key={priceRow.label}
                        className="grid gap-3 px-4 py-3.5 sm:grid-cols-[minmax(64px,0.65fr)_minmax(110px,1fr)_minmax(110px,1fr)] sm:items-center sm:gap-4 sm:px-5"
                      >
                        <span className="text-sm font-medium text-[#C9C9CE]">
                          {priceRow.label}
                        </span>
                        <div className="flex items-center justify-between gap-3 sm:block sm:text-right">
                          <span className="text-xs text-[#8F8F95] sm:hidden">평일</span>
                          <strong className="text-base font-semibold tabular-nums text-white">
                            {formatFee(priceRow.weekday ?? null)}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between gap-3 sm:block sm:text-right">
                          <span className="text-xs text-[#8F8F95] sm:hidden">주말·공휴일</span>
                          <strong className="text-base font-semibold tabular-nums text-white">
                            {formatFee(priceRow.weekend ?? null)}
                          </strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
