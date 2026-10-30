import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { fetchBlogPreview } from "../src/lib/blogPreview.ts";

const apply = process.argv.includes("--apply");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const now = new Date().toISOString();

// Every URL below was checked against its search result and the named facility.
// Never substitute a nearby court, a directory entry, or a generic tennis article.
const catalog = [
  { city: "가평군", match: /^가평실내테니스장 [1-5]번코트$/, relevant: /가평.{0,16}(종합운동장)?.{0,20}테니스/i, urls: ["https://blog.naver.com/tennisjangi/223894244651", "https://blog.naver.com/chupa007/223636755480", "https://blog.naver.com/lgh14563/223674305238"] },
  { city: "고양시", match: /^성사시립테니스장 전천후코트$/, relevant: /성사시립테니스장.*실내|실내테니스장.*성사시립테니스장/i, urls: ["https://blog.naver.com/bey13579/223897791638"] },
  { city: "고양시", match: /^성라테니스장$/, relevant: /성라.{0,12}테니스/i, urls: ["https://jshstory.tistory.com/78"] },
  { city: "고양시", match: /^성저테니스장$/, relevant: /성저.{0,12}테니스/i, urls: ["https://blog.naver.com/zoe_zs2/224381251343", "https://blog.naver.com/yihy131/222835488246"] },
  { city: "고양시", match: /^충장테니스장$/, relevant: /충장.{0,20}테니스/i, urls: ["https://blog.naver.com/creativejunior/222843405852", "https://blog.naver.com/tennisabc/60210723696"] },
  { city: "고양시", match: /^고양백석체육센터 테니스$/, relevant: /고양백석체육센터.{0,15}테니스/i, urls: ["https://blog.naver.com/leezzangs/222805516577"] },
  { city: "고양시", match: /^(고양백석체육센터 테니스|백석 테니스장)$/, relevant: /고양백석체육센터.{0,18}테니스|백석테니스장/i, urls: ["https://blog.naver.com/diny_tennis/223431666459"] },
  { city: "고양시", match: /^대화테니스장$/, relevant: /대화.{0,8}레포츠공원.{0,15}테니스/i, urls: ["https://blog.naver.com/goranilog/223151860242", "https://blog.naver.com/leezzangs/222641547877"] },
  { city: "광명시", match: /^구름산 시립테니스장$/, relevant: /구름산.{0,12}테니스/i, urls: ["https://blog.naver.com/seventool_player/223769897400", "https://blog.naver.com/nety0180/224053319259", "https://blog.naver.com/yks4845/222802138989"] },
  { city: "광명시", match: /^광명시립테니스장$/, relevant: /광명.{0,8}시립.{0,12}테니스/i, urls: ["https://blog.naver.com/skyhi80/223855352236", "https://blog.naver.com/it-s_good/223553249120"] },
  { city: "광주시", match: /^광주시 양벌테니스돔$/, relevant: /양벌.{0,12}테니스/i, urls: ["https://blog.naver.com/gjcityi/224391144904", "https://blog.naver.com/egg___mong/224350353665"] },
  { city: "광주시", match: /^만선생활체육시설 테니스장$/, relevant: /만선.{0,24}테니스/i, urls: ["https://blog.naver.com/youjininreallife/223689825757", "https://blog.naver.com/water_beean/224064979794"] },
  { city: "광주시", match: /^도척스포츠타운 테니스장\([AB]\)$/, relevant: /도척그린공원.{0,12}테니스/i, urls: ["https://blog.naver.com/yellowhole_biz/223313211196"] },
  { city: "군포시", match: /^산본IC체육공원 테니스장$/, relevant: /산본.{0,8}IC.{0,20}테니스/i, urls: ["https://blog.naver.com/gpdnjs1104/224011196404", "https://blog.naver.com/zeeumzeeum/223669545394", "https://blog.naver.com/logan_life/223695247279"] },
  { city: "군포시", match: /^시민체육광장 테니스장$/, relevant: /군포.{0,12}시민.{0,8}체육광장.{0,15}테니스|시민체육광장.{0,15}테니스/i, urls: ["https://twinstory.tistory.com/157", "https://blog.naver.com/qlsqls694/223531028642"] },
  { city: "군포시", match: /^송정체육공원 테니스장$/, relevant: /군포.{0,12}송정체육공원.{0,15}테니스/i, urls: ["https://blog.naver.com/xiankua/224366039862"] },
  { city: "남양주시", match: /^가운푸른물센터 테니스장$/, relevant: /가운푸른물센터.{0,12}테니스/i, urls: ["https://blog.naver.com/yellowhole_biz/223313259077"] },
  { city: "남양주시", match: /^가운동 테니스장$/, relevant: /가운.{0,12}테니스/i, urls: ["https://blog.naver.com/hj_otto/223769064780"] },
  { city: "남양주시", match: /^양골체육시설 테니스장$/, relevant: /양골.{0,15}테니스/i, urls: ["https://blog.naver.com/tennisjangi/223871620628", "https://blog.naver.com/boodlepoodle/223232700861", "https://blog.naver.com/tennisjangi/223161461442"] },
  { city: "남양주시", match: /^양지리 생활체육공원 테니스장$/, relevant: /양지리.{0,24}테니스/i, urls: ["https://blog.naver.com/tennisjangi/223778784877", "https://blog.naver.com/trust__park/223838355635", "https://blog.naver.com/su_et_jin/223133973542"] },
  { city: "남양주시", match: /^월문리 체육시설/, relevant: /월문리.{0,24}테니스|덕소.{0,20}테니스/i, urls: ["https://blog.naver.com/tennisjangi/223767389658", "https://blog.naver.com/zerotennis/223716519540", "https://blog.naver.com/hochul1005/224035924342"] },
  { city: "남양주시", match: /광전리 테니스장/, relevant: /광전리.{0,15}테니스/i, urls: ["https://blog.naver.com/tennisjangi/223818921927", "https://blog.naver.com/tennisjangi/223271832970"] },
  { city: "남양주시", match: /별내체육공원테니스장/, relevant: /별내.{0,10}체육공원.{0,15}테니스|별내택지지구.{0,15}테니스/i, urls: ["https://blog.naver.com/writer_oh_store/223912839070", "https://blog.naver.com/zerotennis/223693338052"] },
  { city: "남양주시", match: /^장현배수지 생활체육시설 테니스장$/, relevant: /장현배수지.{0,25}테니스/i, urls: ["https://blog.naver.com/ghdlwwk_00/223949194898", "https://blog.naver.com/tennisjangi/223431959738"] },
  { city: "남양주시", match: /^지금배수지테니스장$/, relevant: /지금배수지.{0,12}테니스/i, urls: ["https://blog.naver.com/gangthlete/222928449575"] },
  { city: "남양주시", match: /^진건공공하수처리시설 테니스장/, relevant: /진건.{0,20}(공공하수처리시설|푸른물센터).{0,20}테니스/i, urls: ["https://blog.naver.com/spotteddog-/223470076128", "https://blog.naver.com/chae_chae_log/223857839280", "https://blog.naver.com/hyunzero7/223293752646"] },
  { city: "남양주시", match: /^약대울 체육시설 테니스장/, relevant: /약대울.{0,15}테니스/i, urls: ["https://blog.naver.com/boodlepoodle/223232681239"] },
  { city: "남양주시", match: /^다산진건 체육공원1호 테니스장$/, relevant: /다산.{0,12}체육공원.{0,8}1호.{0,15}테니스|다산.{0,8}제1체육공원.{0,15}테니스/i, urls: ["https://blog.naver.com/tennisjangi/223851284980", "https://blog.naver.com/do_zin2_archive/223372421649"] },
  { city: "남양주시", match: /^체육공원2호 \(테니스코트\)$/, relevant: /다산.{0,12}체육공원.{0,8}2호.{0,15}테니스/i, urls: ["https://blog.naver.com/tennisjangi/223248354822"] },
  { city: "남양주시", match: /^퇴계원 테니스장$/, relevant: /퇴계원.{0,15}테니스/i, urls: ["https://blog.naver.com/tennisjangi/223415222749", "https://blog.naver.com/tennisjangi/223771901579"] },
  { city: "남양주시", match: /^북한강테니스장$/, relevant: /북한강.{0,12}테니스/i, urls: ["https://blog.naver.com/tennisjangi/224379000170", "https://blog.naver.com/book-till-you-drop/223013122117"] },
  { city: "남양주시", match: /^화도테니스장$/, relevant: /화도.{0,15}테니스/i, urls: ["https://blog.naver.com/daily_review12/224225620798", "https://blog.naver.com/tennisjangi/222803114098", "https://blog.naver.com/daeun5874/222909481220"] },
  { city: "성남시", match: /^(본사 테니스장|테니스장)$/, address: /한국국제협력단|대왕판교로 825/, relevant: /한국국제협력단.{0,15}테니스|코이카.{0,15}테니스/i, urls: ["https://blog.naver.com/ehqldpfla/223932377858"] },
  { city: "안성시", match: /^안성맞춤소프트테니스구장/, relevant: /안성맞춤.{0,8}소프트.{0,8}테니스/i, urls: ["https://blog.naver.com/jina_gogo/223187214750"] },
  { city: "안성시", match: /^안성맞춤소프트테니스구장/, relevant: /안성맞춤.{0,8}소프트.{0,8}테니스/i, urls: ["https://blog.naver.com/imw1337/223159249487"] },
  { city: "안성시", match: /^일죽테니스장\([12]코트\)$/, relevant: /안성.{0,12}일죽.{0,12}테니스/i, urls: ["https://blog.naver.com/jsclub-/223569875609"] },
  { city: "안성시", match: /^신건지소공원 테니스장\([1-3]코트\)$/, relevant: /안성.{0,12}신건지.{0,12}테니스/i, urls: ["https://blog.naver.com/gp1229/223430559792"] },
  { city: "안성시", match: /^금광테니스장\([12]코트\)$/, relevant: /안성.{0,8}금광테니스장/i, urls: ["https://blog.naver.com/nac2707/223907584514"] },
  { city: "양주시", match: /^삼숭생활체육공원 테니스장$/, relevant: /삼숭생활체육공원.{0,15}테니스/i, urls: ["https://blog.naver.com/sb1023_/224249820958", "https://blog.naver.com/jjj1779/224319209223", "https://blog.naver.com/ymmd_ss/223840905480"] },
  { city: "양주시", match: /^광적생활체육공원 테니스장$/, relevant: /광적.{0,20}테니스/i, urls: ["https://blog.naver.com/ahdbsdk/223278575738", "https://blog.naver.com/rinto0916/222907456966", "https://twinstory.tistory.com/151"] },
  { city: "양주시", match: /^백석생활체육공원 (실내|실외)테니스장$/, relevant: /백석생활체육공원.{0,15}테니스/i, urls: ["https://blog.naver.com/jisuninparis/223231154275"] },
  { city: "양주시", match: /^백석생활체육공원 실내테니스장$/, relevant: /백석생활체육공원.{0,15}실내.{0,12}테니스/i, urls: ["https://twinstory.tistory.com/156"] },
  { city: "양주시", match: /^신천생활체육공원 테니스장$/, relevant: /신천생활체육공원.{0,15}테니스/i, urls: ["https://blog.naver.com/jisuninparis/223413895563"] },
  { city: "양평군", match: /^강하테니스장$/, relevant: /강하.{0,12}테니스/i, urls: ["https://blog.naver.com/bekeyjenny/222937484506"] },
  { city: "양평군", match: /^개군레포츠공원 테니스장$/, relevant: /양평.{0,12}개군.{0,12}테니스/i, urls: ["https://blog.naver.com/choi554/223509576964"] },
  { city: "양평군", match: /^서종생활체육공원 테니스장$/, relevant: /서종문화체육공원.{0,15}테니스/i, urls: ["https://blog.naver.com/brella-um/224319299506"] },
  { city: "양평군", match: /^용문 테니스장$/, relevant: /용문테니스장.{0,12}인조잔디/i, urls: ["https://blog.naver.com/ssjjhh1200/223105495431"] },
  { city: "양평군", match: /^양동레포츠공원 테니스장$/, relevant: /양동레포츠공원.{0,15}테니스/i, urls: ["https://blog.naver.com/yks4845/223302862968"] },
  { city: "양주시", match: /^옥정배수지공원 테니스장 풋살장$/, relevant: /옥정배수지.{0,20}테니스/i, urls: ["https://blog.naver.com/jisuninparis/223397539894", "https://blog.naver.com/taetae_94/223803237841", "https://blog.naver.com/jjj1779/224313573965"] },
  { city: "용인시", match: /^골드CC 시립테니스장/, relevant: /골드.{0,12}테니스|용인시립테니스장/i, urls: ["https://blog.naver.com/jinjoo0426/223742249491"] },
  { city: "용인시", match: /^남사테니스장$/, relevant: /남사.{0,15}테니스/i, urls: ["https://blog.naver.com/hjlim0727/223379850937"] },
  { city: "용인시", match: /^공세동 테니스장$/, relevant: /공세동.{0,15}테니스/i, urls: ["https://blog.naver.com/k8020_/224249038723"] },
  { city: "용인시", match: /^수지체육공원 테니스장$/, relevant: /수지체육공원.{0,15}테니스/i, urls: ["https://blog.naver.com/jjii2407/224334943467"] },
  { city: "용인시", match: /^동백산오름공원 테니스장/, relevant: /동백.{0,12}산오름공원.{0,15}테니스/i, urls: ["https://blog.naver.com/snowwhite0813/224265918045"] },
  { city: "용인시", match: /^모현레스피아 테니스장$/, relevant: /모현.{0,10}레스피아.{0,15}테니스/i, urls: ["https://blog.naver.com/choi554/223551654707", "https://blog.naver.com/hjlim0727/223265326130"] },
  { city: "용인시", match: /^성복배수지 테니스장$/, relevant: /성복.{0,8}(배수지)?.{0,15}테니스/i, urls: ["https://blog.naver.com/y982365/223772129929", "https://blog.naver.com/h0du_m/223904739878", "https://blog.naver.com/ehqldpfla/223224256460"] },
  { city: "용인시", match: /^신봉고가하부 테니스장$/, relevant: /신봉.{0,8}고가하부.{0,15}테니스/i, urls: ["https://blog.naver.com/dpfxj1111/224291218901", "https://blog.naver.com/tennisbohemian/223857934126"] },
  { city: "용인시", match: /^신역동 테니스장$/, relevant: /신역동.{0,15}테니스/i, urls: ["https://blog.naver.com/moafinds/224375705893", "https://blog.naver.com/vladyblood/223227231442", "https://blog.naver.com/k8020_/223857307442"] },
  { city: "용인시", match: /^기흥테니스장\([ABD]코트\)$/, relevant: /기흥.{0,15}테니스/i, urls: ["https://blog.naver.com/jimmini_/223173900809"] },
  { city: "의왕시", match: /^고천배수지 테니스장$/, relevant: /고천배수지.{0,15}테니스/i, urls: ["https://blog.naver.com/sallyjuli/223656150723"] },
  { city: "의왕시", match: /^부곡테니스장$/, relevant: /부곡.{0,15}테니스/i, urls: ["https://blog.naver.com/qlsqls694/223548114048"] },
  { city: "의왕시", match: /^산빛테니스장$/, relevant: /산빛.{0,18}테니스/i, urls: ["https://blog.naver.com/gpdnjs1104/223401925963", "https://blog.naver.com/alth2214/223514477764"] },
  { city: "의왕시", match: /^(내손테니스장|고천테니스장|산빛테니스장|청계테니스장|청계체육공원 테니스장)/, relevant: /의왕테니스장.{0,30}예약방법.{0,100}내손.{0,25}산빛.{0,25}청계.{0,25}고천/i, urls: ["https://blog.naver.com/yong3004_2/223519430152"] },
  { city: "의왕시", match: /^(청계테니스장|청계체육공원 테니스장)/, relevant: /청계.{0,18}테니스/i, urls: ["https://blog.naver.com/gpdnjs1104/223665791442", "https://blog.naver.com/jessica-inkorea/224273415820", "https://blog.naver.com/ckswns4101/223918471861"] },
  { city: "의정부시", match: /^송산테니스장$/, relevant: /송산.{0,12}테니스/i, urls: ["https://blog.naver.com/nscout/222602273912"] },
  { city: "의정부시", match: /^장암테니스장$/, relevant: /장암.{0,12}테니스/i, urls: ["https://blog.naver.com/jchaeng1201/223785722792"] },
  { city: "이천시", match: /^4-테니스장 \(대월면 체육공원내\) 실외 \([123]면\)$/, relevant: /이천.{0,12}대월.{0,15}테니스/i, urls: ["https://blog.naver.com/choi554/223125988590"] },
  { city: "하남시", match: /^미사한강공원 테니스장 [1-4]코트$/, relevant: /미사한강공원.{0,15}테니스/i, urls: ["https://blog.naver.com/tennisjangi/223854162133"] },
  { city: "하남시", match: /^미사한강공원 테니스장 [1-4]코트$/, relevant: /미사.{0,8}한강.{0,8}공원.{0,15}테니스/i, urls: ["https://blog.naver.com/jy8769_/224013785641", "https://blog.naver.com/chris2528/223399825696"] },
  { city: "하남시", match: /^하남종합운동장 제[12]테니스장$/, relevant: /하남종합운동장.{0,15}테니스/i, urls: ["https://blog.naver.com/tennisjangi/223867963080"] },
];

const { data: courts, error: courtsError } = await db.from("courtinfo")
  .select("id,basic_city,basic_court_name,basic_address")
  .eq("basic_region", "경기").range(0, 999);
if (courtsError) throw courtsError;
const { data: currentLinks, error: linksError } = await db.from("court_blog_links")
  .select("id,court_id,url,sort_order").in("court_id", courts.map(({ id }) => id)).range(0, 999);
if (linksError) throw linksError;
const currentByCourt = new Map(courts.map(({ id }) => [id, currentLinks.filter((link) => link.court_id === id)]));

const planByCourt = new Map();
for (const definition of catalog) {
  const targets = courts.filter((court) => court.basic_city === definition.city && definition.match.test(court.basic_court_name) && (!definition.address || definition.address.test(court.basic_address ?? "")));
  if (!targets.length) throw new Error(`시설 매칭 실패: ${definition.city} ${definition.match}`);
  const neededUrls = definition.urls.filter((url) => targets.some((court) => {
    const current = currentByCourt.get(court.id);
    const planned = planByCourt.get(court.id)?.add ?? [];
    return current.length + planned.length < 3
      && !current.some((link) => link.url === url)
      && !planned.some((link) => link.url === url);
  }));
  if (!neededUrls.length) continue;
  const previews = await Promise.all(neededUrls.map((url) => fetchBlogPreview({ url })));
  for (const preview of previews) {
    const text = `${preview.title ?? ""} ${preview.description ?? ""}`;
    if (!definition.relevant.test(text.replace(/\s+/g, ""))) throw new Error(`후기 글 관련성 확인 실패: ${definition.city} ${definition.match} ${preview.url} ${text}`);
  }
  for (const court of targets) {
    const current = currentByCourt.get(court.id);
    const plan = planByCourt.get(court.id) ?? { court, add: [], startOrder: Math.max(-1, ...current.map((link) => link.sort_order ?? -1)) + 1 };
    const seen = new Set([...current.map((link) => link.url), ...plan.add.map(({ url }) => url)]);
    const add = previews.filter(({ url }) => !seen.has(url)).slice(0, Math.max(0, 3 - current.length - plan.add.length));
    plan.add.push(...add);
    if (plan.add.length) planByCourt.set(court.id, plan);
  }
}
const plans = [...planByCourt.values()];

console.log(JSON.stringify({ mode: apply ? "APPLY" : "DRY_RUN", courtCount: plans.length, linkCount: plans.reduce((sum, plan) => sum + plan.add.length, 0), courts: plans.map(({ court, add }) => `${court.basic_city} ${court.basic_court_name}: ${add.length}`) }, null, 2));
if (!apply) process.exit(0);

async function storeThumbnail(url) {
  if (!url) return null;
  try {
    const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; CourtsKoreaPreview/1.0; +https://courtskorea.com)", Referer: "https://blog.naver.com/" } });
    if (!response.ok) return url;
    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() ?? "image/jpeg";
    const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > 2 * 1024 * 1024) return url;
    const path = `${createHash("sha256").update(url).digest("hex")}.${extension}`;
    const { error } = await db.storage.from("blog-thumbnails").upload(path, buffer, { contentType, cacheControl: "31536000", upsert: true });
    if (error) return url;
    return db.storage.from("blog-thumbnails").getPublicUrl(path).data.publicUrl;
  } catch { return url; }
}

let inserted = 0;
for (const { court, add, startOrder } of plans) {
  const rows = await Promise.all(add.map(async (preview, index) => ({
    court_id: court.id,
    url: preview.url,
    title: preview.title,
    description: preview.description,
    thumbnail_url: await storeThumbnail(preview.thumbnail_url),
    source: preview.source,
    sort_order: startOrder + index,
    updated_at: now,
  })));
  const { error } = await db.from("court_blog_links").insert(rows);
  if (error) throw new Error(`${court.basic_city} ${court.basic_court_name}: ${error.message}`);
  inserted += rows.length;
  console.log(`완료 ${court.basic_city} ${court.basic_court_name}: +${rows.length}`);
}

const targetIds = plans.map(({ court }) => court.id);
const { data: verified, error: verifyError } = await db.from("court_blog_links")
  .select("court_id,url").in("court_id", targetIds).range(0, 999);
if (verifyError) throw verifyError;
for (const { court, add } of plans) {
  const urls = new Set(verified.filter((link) => link.court_id === court.id).map((link) => link.url));
  if (add.some(({ url }) => !urls.has(url))) throw new Error(`사후 검증 실패: ${court.basic_court_name}`);
}
console.log(JSON.stringify({ updatedCourts: plans.length, insertedLinks: inserted }, null, 2));
