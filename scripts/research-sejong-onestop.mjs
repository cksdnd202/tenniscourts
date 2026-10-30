const base = "https://onestop.sejong.go.kr";
const plans = [
  ["다정동 저류지", "OP689236770388578"],
  ["전의생활체육공원 평일", "OP9504646100661753"],
  ["전의생활체육공원 주말", "OP10350241418919729"],
  ["중앙공원", "OP9851238048992972"],
  ["조치원 체육공원", "OP9832480592984493"],
  ["수질복원센터B", "OP9766551748881900"],
  ["수질복원센터A", "OP9766299937408048"],
  ["소정", "OP9765397045927300"],
  ["금남", "OP9765709587997463"],
];

const clean = (value = "") => value
  .replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<br\s*\/?\s*>/gi, " / ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;|&#160;/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&#39;/g, "'")
  .replace(/&quot;/g, '"')
  .replace(/\s+/g, " ")
  .trim();

const post = async (path, params) => {
  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response;
};

const summarizeSchedule = (data) => ({
  facilities: (data.fcltList ?? []).map(({ fcltNo, fcltNm, rceptBgnde, resveBeginHm, today, openYn, oprtnEndde }) => ({
    fcltNo, fcltNm, rceptBgnde, resveBeginHm, today, openYn, oprtnEndde,
  })),
  times: (data.timeList ?? []).map(({ useBeginHm, useEndHm, rntfee }) => ({ useBeginHm, useEndHm, rntfee })),
});

for (const [label, oprtnPlanNo] of plans) {
  const response = await post("/Usr/resve/instDetail.do", {
    fcltClCode: "FC_TENNIS",
    oprtnPlanNo,
    fcltType: "SPT",
    menuName: "테니스장",
  });
  const html = await response.text();
  const fcltNo = html.match(/name="fcltNo" id="fcltNo" value="([^"]+)"/)?.[1];
  const title = clean(html.match(/<div class="reser_fclt_title">([\s\S]*?)<\/div>/i)?.[1]);
  const fields = {};
  for (const match of html.matchAll(/<p class="info_sub">([\s\S]*?)<\/p>\s*<p class="info_txt">([\s\S]*?)<\/p>/gi)) {
    fields[clean(match[1])] = clean(match[2]);
  }
  const weekday = fcltNo
    ? summarizeSchedule(await (await post("/Usr/resve/rest/fcltList.do", {
        oprtnPlanNo, sYear: "2026", sMonth: "09", sDay: "22", fcltNo,
      })).json())
    : null;
  const weekend = fcltNo
    ? summarizeSchedule(await (await post("/Usr/resve/rest/fcltList.do", {
        oprtnPlanNo, sYear: "2026", sMonth: "09", sDay: "26", fcltNo,
      })).json())
    : null;

  console.log(JSON.stringify({ label, oprtnPlanNo, fcltNo, title, fields, weekday, weekend }));
}
