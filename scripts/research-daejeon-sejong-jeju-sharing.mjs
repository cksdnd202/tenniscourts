import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const regions = ["대전", "세종", "제주"];
const { data: courts, error } = await supabase
  .from("courtinfo")
  .select("id,basic_region,basic_city,basic_court_name,basic_address,booking_site_link,source_service_id,etc_desc")
  .in("basic_region", regions)
  .order("basic_region")
  .order("basic_city")
  .order("basic_court_name");
if (error) throw error;

const clean = (value = "") => value
  .replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<br\s*\/?\s*>/gi, " / ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;|&#160;/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/&#39;/g, "'")
  .replace(/&quot;/g, '"')
  .replace(/\s+/g, " ")
  .trim();

const resourceIdFrom = (court) => {
  const urlId = court.booking_site_link?.match(/[?&]rsrc_no=([^&]+)/)?.[1];
  if (urlId) return decodeURIComponent(urlId);
  return court.source_service_id?.split(",")[0]?.trim() || null;
};

const selectedKeys = new Set([
  "평일", "토요일", "일요일/공휴일", "접수일시", "이용기간", "예약 방법",
  "예약 문의", "이용 대상", "이용 정원", "심사 여부", "이용 요금",
  "실내·외 구분", "규모 면적", "수용인원", "주차 가능 여부", "이용 가능 시간",
]);

const compact = (value, limit = 2200) => value.length > limit ? `${value.slice(0, limit)}…` : value;

for (let index = 0; index < courts.length; index += 3) {
  await Promise.all(courts.slice(index, index + 3).map(async (court) => {
    const resourceId = resourceIdFrom(court);
    const detailUrl = resourceId
      ? `https://www.eshare.go.kr/UserPortal/Upv/UprResrcFacl/index.do?rsrc_no=${resourceId}`
      : court.booking_site_link;
    const response = await fetch(detailUrl);
    const html = await response.text();
    const fields = {};
    for (const match of html.matchAll(/<th[^>]*scope="row"[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi)) {
      const key = clean(match[1]);
      if (selectedKeys.has(key)) fields[key] = clean(match[2]);
    }
    const description = clean((html.match(/id="rsrcIntrcnArea"[^>]*>([\s\S]*?)<input[^>]+id="rsrcIntrcnImgAltVal"/i) ?? [])[1]);
    const caution = clean((html.match(/id="atpnArea"[^>]*>([\s\S]*?)<input[^>]+id="atpnImgAltVal"/i) ?? [])[1]);
    const external = [...html.matchAll(/href="(https?:[^"]+)"[^>]*>예약하기/gi)].map((match) => match[1]);

    let calendar = null;
    if (resourceId) {
      const calendarResponse = await fetch(
        `https://www.eshare.go.kr/UserPortal/Upv/${resourceId}/selectCpsResvExclShareCalendar.do`,
        {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: "startDate=2026-09-01&endDate=2026-12-31",
        },
      );
      const calendarRows = await calendarResponse.json().catch(() => []);
      const available = Array.isArray(calendarRows) ? calendarRows.filter(({ useYn }) => useYn === "Y") : [];
      let timeSlots = [];
      if (available[0]?.date) {
        const timeResponse = await fetch(
          `https://www.eshare.go.kr/UserPortal/Upv/${resourceId}/searchCpsGnrResvSchedDetlQty.do`,
          {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: `searchDate=${available[0].date}`,
          },
        );
        const timeRows = await timeResponse.json().catch(() => []);
        timeSlots = Array.isArray(timeRows)
          ? timeRows.map(({ usePsblBgnTm, usePsblEndTm }) => `${usePsblBgnTm}-${usePsblEndTm}`)
          : [];
      }
      calendar = {
        firstAvailable: available[0]?.date ?? null,
        lastAvailable: available.at(-1)?.date ?? null,
        availableCount: available.length,
        availableWeekdays: [...new Set(available.map(({ date }) => new Date(`${date}T00:00:00+09:00`).getDay()))],
        timeSlots,
      };
    }

    console.log(JSON.stringify({
      id: court.id,
      region: court.basic_region,
      city: court.basic_city,
      name: court.basic_court_name,
      address: court.basic_address,
      resourceId,
      status: response.status,
      fields,
      description: compact(description),
      caution: compact(caution),
      external,
      reservationUnnecessary: html.includes("예약불필요 자원입니다"),
      calendar,
    }));
  }));
}
