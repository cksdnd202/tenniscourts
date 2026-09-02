import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const shouldApply = process.argv.includes("--apply");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const courts = [
  ["04a3f610-32cd-4e0a-bbec-8fa74d2a4fad", "광명시립테니스장", "경기 광명시 금하로 201-68", "1448514139", 37.4574317932129, 126.853797912598],
  ["49d82423-eb46-477b-b98f-cecd7069fc0a", "구름산 시립테니스장", "경기 광명시 오리로 493-7", "1099173511", 37.4460961, 126.879649],
  ["a9887099-ee9f-426a-a0e0-8d2c082e694c", "곤지암생활체육공원 테니스장(A)", "경기 광주시 곤지암읍 삼리 612-14", "532291283", 37.3604316711426, 127.321197509766],
  ["d8a6a0d3-7901-44a1-ae0e-8cac21c9a93e", "곤지암생활체육공원 테니스장(B)", "경기 광주시 곤지암읍 삼리 612-14", "532291283", 37.3604316711426, 127.321197509766],
  ["3f554943-8670-44d1-9e7c-88e711d82ea9", "광주시 양벌테니스돔", "경기 광주시 청석로 85", "1287914318", 37.3956909179688, 127.258598327637],
  ["6b29e5b5-1cac-4e77-b67c-c2772a6bd0f3", "도척스포츠타운 테니스장(A)", "경기 광주시 도척면 도척로 676", "1912446942", 37.2946090698242, 127.327201843262],
  ["5a2a7823-439a-4406-b020-fce7d7e78529", "도척스포츠타운 테니스장(B)", "경기 광주시 도척면 도척로 676", "1912446942", 37.2946090698242, 127.327201843262],
  ["c2c7b19e-f6d8-4e5d-9b1b-435f8446ee3a", "만선생활체육시설 테니스장", "경기 광주시 곤지암읍 만선로 12-17", "1817020581", 37.3658054683798, 127.402587768227],
  ["4c184796-591f-4913-848d-a7d60aa81612", "한국도로공사 경기광주지사 테니스장", "경기 광주시 곤지암읍 독고개길 15", "11797195", 37.3580514360783, 127.316984423028],
  ["6405e47c-0ef8-488d-9fb1-1dbaeced2bc4", "군포지사 테니스장", "경기 군포시 군포로 86", "11797200", 37.3239080249964, 126.918419598795],
  ["8f43201b-06f2-4226-8f9b-bb28cace2d1d", "산본IC체육공원 테니스장", "경기 군포시 산본로 486", "38173138", 37.375613, 126.928928],
  ["3b765d38-71e9-482b-bf80-c7825f8833bf", "송정체육공원 테니스장", "경기 군포시 도마교동 322", "1436555330", 37.3119341, 126.9256727],
  ["6aa30ff5-a736-410a-ac8c-79800a0be793", "시민체육광장 테니스장", "경기 군포시 산본로 267", "20349745", 37.3540356844596, 126.936815220052],
  ["9b285272-219f-4644-b9df-d68c6b811512", "한얼근린공원 하부 테니스장", "경기 군포시 번영로561번길 70", "19271878", 37.363894, 126.938318],
].map(([id, name, address, placeId, latitude, longitude]) => ({
  id,
  name,
  address,
  mapLink: `https://map.naver.com/p/entry/place/${placeId}`,
  latitude,
  longitude,
}));

if (!shouldApply) {
  console.table(courts.map(({ id, name, address, mapLink, latitude, longitude }) => ({
    id,
    name,
    address,
    mapLink,
    latitude,
    longitude,
  })));
  console.log("드라이런입니다. 실제 반영은 --apply 옵션을 사용하세요.");
  process.exit(0);
}

for (const court of courts) {
  const { data, error } = await supabase
    .from("courtinfo")
    .update({
      basic_address: court.address,
      basic_map_link: court.mapLink,
      basic_latitude: court.latitude,
      basic_longitude: court.longitude,
    })
    .eq("id", court.id)
    .eq("basic_court_name", court.name)
    .select("id, basic_court_name");

  if (error) throw error;
  if (data.length !== 1) {
    throw new Error(`${court.name}: 갱신 대상이 정확히 1건이 아닙니다 (${data.length}건).`);
  }
}

const ids = courts.map(({ id }) => id);
const { data: verified, error: verifyError } = await supabase
  .from("courtinfo")
  .select("id, basic_court_name, basic_city, basic_address, basic_map_link, basic_latitude, basic_longitude")
  .in("id", ids)
  .order("basic_city")
  .order("basic_court_name");

if (verifyError) throw verifyError;

const invalid = verified.filter((court) =>
  !court.basic_address ||
  !court.basic_map_link?.startsWith("https://map.naver.com/p/entry/place/") ||
  court.basic_latitude == null ||
  court.basic_longitude == null
);

if (verified.length !== courts.length || invalid.length > 0) {
  throw new Error(`검증 실패: 조회 ${verified.length}건, 유효하지 않은 행 ${invalid.length}건`);
}

console.table(verified);
console.log(`검증 완료: ${verified.length}건 모두 주소·네이버지도 링크·위도·경도가 채워졌습니다.`);
