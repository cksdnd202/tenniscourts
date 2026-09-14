import { fetchBlogPreview } from "../src/lib/blogPreview.ts";

const searches = [
  { court: "김포 종합운동장 테니스장", queries: ["김포 종합운동장 테니스장", "김포시민회관 테니스장"] },
  { court: "동성테니스클럽", queries: ["김포 동성테니스클럽", "하성면 동성테니스클럽"] },
  { court: "심플테니스", queries: ["김포 심플테니스", "통진 심플테니스"] },
  { court: "양곡테니스장", queries: ["김포 양곡테니스장", "양곡테니스클럽 김포"] },
  { court: "통진 레코파크 테니스장", queries: ["김포 통진 레코파크 테니스장", "레코파크 테니스장"] },
  { court: "풍년근린공원 테니스장", queries: ["김포 풍년근린공원 테니스장", "김포 풍년공원 테니스장"] },
];

function decodeHtml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("\\u0026", "&")
    .replaceAll("\\/", "/");
}

async function searchNaver(query) {
  const url = new URL("https://search.naver.com/search.naver");
  url.searchParams.set("where", "view");
  url.searchParams.set("query", query);

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/139 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!response.ok) throw new Error(`${query} 검색 실패: ${response.status}`);

  const html = decodeHtml(await response.text());
  const matches = html.matchAll(/https?:\/\/(?:m\.)?blog\.naver\.com\/[A-Za-z0-9_.-]+\/\d{6,}/g);
  return [...new Set([...matches].map(([link]) => link.replace("https://m.blog", "https://blog")))];
}

const courtFilter = process.argv.find((argument) => argument.startsWith("--court="))?.slice(8);
const selectedSearches = courtFilter
  ? searches.filter(({ court }) => court.includes(courtFilter))
  : searches;

if (!selectedSearches.length) throw new Error(`검색 대상이 없습니다: ${courtFilter}`);

const output = [];
for (const search of selectedSearches) {
  const urls = [];
  for (const query of search.queries) {
    for (const url of await searchNaver(query)) {
      if (!urls.includes(url)) urls.push(url);
    }
  }

  const previews = [];
  for (const url of urls.slice(0, 15)) {
    previews.push(await fetchBlogPreview({ url }));
  }
  output.push({ court: search.court, resultCount: urls.length, previews });
}

console.log(JSON.stringify(output, null, 2));
