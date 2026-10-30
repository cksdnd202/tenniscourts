import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: courts, error } = await supabase
  .from("courtinfo")
  .select("basic_court_name,basic_city,booking_site_link,source_service_id")
  .eq("basic_region", "충남")
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

for (let index = 0; index < courts.length; index += 4) {
  await Promise.all(courts.slice(index, index + 4).map(async (court) => {
    const html = await (await fetch(court.booking_site_link)).text();
    const fields = {};
    for (const match of html.matchAll(/<th[^>]*scope="row"[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi)) {
      const key = clean(match[1]);
      if (["평일", "토요일", "일요일/공휴일", "접수일시", "이용기간", "예약 방법", "예약 문의", "이용 대상", "이용 정원", "심사 여부", "이용 요금", "실내·외 구분", "규모 면적"].includes(key)) {
        fields[key] = clean(match[2]);
      }
    }
    const description = clean((html.match(/id="rsrcIntrcnArea"[^>]*>([\s\S]*?)<input[^>]+id="rsrcIntrcnImgAltVal"/i) ?? [])[1]);
    const caution = clean((html.match(/id="atpnArea"[^>]*>([\s\S]*?)<input[^>]+id="atpnImgAltVal"/i) ?? [])[1]);
    const external = [...html.matchAll(/href="(https?:[^"]+)"[^>]*>예약하기/gi)].map((match) => match[1]);
    const serviceId = court.source_service_id?.split(",")[0]?.trim();
    let calendar = null;
    if (serviceId) {
      const calendarResponse = await fetch(
        `https://www.eshare.go.kr/UserPortal/Upv/${serviceId}/selectCpsResvExclShareCalendar.do`,
        {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: "startDate=2026-09-01&endDate=2026-12-31",
        },
      );
      const calendarRows = await calendarResponse.json().catch(() => []);
      const available = calendarRows.filter(({ useYn }) => useYn === "Y");
      let timeSlots = [];
      if (available[0]?.date) {
        const timeResponse = await fetch(
          `https://www.eshare.go.kr/UserPortal/Upv/${serviceId}/searchCpsGnrResvSchedDetlQty.do`,
          {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: `searchDate=${available[0].date}`,
          },
        );
        const timeRows = await timeResponse.json().catch(() => []);
        timeSlots = timeRows.map(({ usePsblBgnTm, usePsblEndTm }) => `${usePsblBgnTm}-${usePsblEndTm}`);
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
      name: court.basic_court_name,
      city: court.basic_city,
      fields,
      description,
      caution,
      external,
      reservationUnnecessary: html.includes("예약불필요 자원입니다"),
      calendar,
    }));
  }));
}
