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
  ["96595d1b-8910-4fc3-9e2f-f546b5434656", "김포생활체육관 솔터테니스장 1번코트", "1556056277"],
  ["fff7ef29-11e5-46ae-8e0c-3c09d68e74c5", "김포생활체육관 솔터테니스장 2번코트", "1519736493"],
  ["e3e2e1f0-7617-4fbb-adc3-87602da69aa2", "김포생활체육관 솔터테니스장 3번코트", "1111596627"],
  ["49ce1caa-b24d-46eb-ad2f-84f113c081d6", "김포생활체육관 솔터테니스장 4번코트", "1295211832"],
  ["28ed74a7-563f-4b58-9760-05e6476f3c1e", "김포생활체육관 솔터테니스장 5번코트", "1443134684"],
  ["7922da3e-030f-429a-8144-b6e86966837e", "김포생활체육관 솔터테니스장 6번코트", "1756472684"],
  ["d0af3338-34f2-4af0-8217-dcfad1c0af50", "김포생활체육관 솔터테니스장 7번코트", "1676614588"],
  ["9d671a41-5d84-4cd0-af13-1db0aa29db79", "김포생활체육관 솔터테니스장 8번코트", "1246679884"],
  ["584d33fd-c692-4da2-b313-483ab1dc61c9", "서암생활체육공원 테니스장 (1번)", "1035997588"],
  ["91b048f7-c660-4681-92c2-fd3041e3eb22", "서암생활체육공원 테니스장 (2번)", "1997562863"],
  ["f32bbc5a-d901-44e8-9236-89f06624e5bd", "서암생활체육공원 테니스장 (3번)", "1833574388"],
  ["70698fd0-d2f8-4c92-9a74-92d7a80f6f92", "종합운동장 테니스장", "1272526582"],
].map(([id, name, placeId]) => ({
  id,
  name,
  mapLink: `https://map.naver.com/p/entry/place/${placeId}`,
}));

if (!shouldApply) {
  console.table(courts);
  console.log("드라이런입니다. 실제 반영은 --apply 옵션을 사용하세요.");
  process.exit(0);
}

for (const court of courts) {
  const { data, error } = await supabase
    .from("courtinfo")
    .update({ basic_map_link: court.mapLink })
    .eq("id", court.id)
    .eq("basic_court_name", court.name)
    .select("id, basic_court_name, basic_map_link");

  if (error) throw error;
  if (data.length !== 1) {
    throw new Error(`${court.name}: 갱신 대상이 정확히 1건이 아닙니다 (${data.length}건).`);
  }
}

const ids = courts.map(({ id }) => id);
const { data: verified, error: verifyError } = await supabase
  .from("courtinfo")
  .select("id, basic_court_name, basic_city, basic_map_link")
  .in("id", ids)
  .order("basic_court_name");

if (verifyError) throw verifyError;

const invalid = verified.filter(
  (court) => !court.basic_map_link?.startsWith("https://map.naver.com/p/entry/place/"),
);

if (verified.length !== courts.length || invalid.length > 0) {
  throw new Error(`검증 실패: 조회 ${verified.length}건, 유효하지 않은 행 ${invalid.length}건`);
}

console.table(verified);
console.log(`검증 완료: ${verified.length}건 모두 네이버지도 장소 링크로 갱신됐습니다.`);
