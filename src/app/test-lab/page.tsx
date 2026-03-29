import { ImportSeoulButton } from "./ImportSeoulButton";

type SeoulSportRow = {
  svcId: string;
  svcName: string;
  svcStatus: string;
  areaName: string;
  placeName: string;
  reserveUrl: string;
  receiptBeginAt: string;
  receiptEndAt: string;
};

type FieldEntry = {
  key: string;
  value: string;
};

type MatchGuide = {
  websiteField: string;
  status: "가능" | "부분 가능" | "어려움";
  description: string;
};

function extractTagValue(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (!match) return "";
  return match[1]
    .replace(/^<!\[CDATA\[/, "")
    .replace(/\]\]>$/, "")
    .trim();
}

function parseRowsFromXml(xml: string): SeoulSportRow[] {
  const rowBlocks = xml.match(/<row>[\s\S]*?<\/row>/gi) ?? [];
  return rowBlocks.map((row) => ({
    svcId: extractTagValue(row, "SVCID"),
    svcName: extractTagValue(row, "SVCNM"),
    svcStatus: extractTagValue(row, "SVCSTATNM"),
    areaName: extractTagValue(row, "AREANM"),
    placeName: extractTagValue(row, "PLACENM"),
    reserveUrl: extractTagValue(row, "SVCURL"),
    receiptBeginAt: extractTagValue(row, "RCPTBGNDT"),
    receiptEndAt: extractTagValue(row, "RCPTENDDT"),
  }));
}

function parseRowEntries(xml: string): FieldEntry[] {
  const firstTennisRow =
    xml.match(/<row>[\s\S]*?<MINCLASSNM>\s*테니스장\s*<\/MINCLASSNM>[\s\S]*?<\/row>/i)?.[0] ??
    xml.match(/<row>[\s\S]*?<\/row>/i)?.[0];

  if (!firstTennisRow) return [];

  const entries: FieldEntry[] = [];
  const tagRegex = /<([A-Z0-9_]+)>([\s\S]*?)<\/\1>/g;
  let match: RegExpExecArray | null = null;

  while ((match = tagRegex.exec(firstTennisRow)) !== null) {
    const [, key, rawValue] = match;
    const value = rawValue
      .replace(/^<!\[CDATA\[/, "")
      .replace(/\]\]>$/, "")
      .trim();
    entries.push({ key, value });
  }

  return entries;
}

const fieldMatchGuide: Record<string, MatchGuide> = {
  SVCID: {
    websiteField: "id 또는 외부서비스ID 신규 컬럼",
    status: "가능",
    description: "고유 식별자라서 DB 키/외부연동 키로 직접 저장 가능합니다.",
  },
  SVCNM: {
    websiteField: "basic_court_name",
    status: "가능",
    description: "시설명을 코트명으로 매핑해 상세/목록 제목으로 바로 사용 가능합니다.",
  },
  PLACENM: {
    websiteField: "basic_court_name 또는 보조 장소명 컬럼",
    status: "부분 가능",
    description: "코트명과 중복될 수 있어 코트명/장소명을 분리 저장하면 더 정확합니다.",
  },
  SVCURL: {
    websiteField: "booking_site_link",
    status: "가능",
    description: "예약하러가기 링크로 즉시 사용 가능합니다.",
  },
  AREANM: {
    websiteField: "basic_city",
    status: "가능",
    description: "자치구(구 단위) 정보로 basic_city에 매핑하는 흐름에 맞습니다.",
  },
  X: {
    websiteField: "basic_map_link 또는 좌표 컬럼 신규 추가",
    status: "부분 가능",
    description: "현재는 지도 링크 위주라 좌표 컬럼을 추가하면 지도 기능 확장에 유리합니다.",
  },
  Y: {
    websiteField: "basic_map_link 또는 좌표 컬럼 신규 추가",
    status: "부분 가능",
    description: "경도/위도를 함께 저장하면 지도 핀/거리 계산이 가능해집니다.",
  },
  RCPTBGNDT: {
    websiteField: "booking_open_day_owner/normal + booking_open_time_*",
    status: "부분 가능",
    description: "날짜시간 원문은 저장 가능하지만 현재 로직용 파생 필드 변환 규칙이 필요합니다.",
  },
  RCPTENDDT: {
    websiteField: "예약 마감용 신규 컬럼",
    status: "부분 가능",
    description: "현재 스키마에 마감 일시 전용 필드가 없어 신규 컬럼 추가가 좋습니다.",
  },
  SVCSTATNM: {
    websiteField: "use_or_not 또는 예약상태 신규 컬럼",
    status: "부분 가능",
    description: "접수중/마감 같은 상태를 별도 상태값으로 저장하면 UI 제어가 쉬워집니다.",
  },
  DTLCONT: {
    websiteField: "etc_desc",
    status: "가능",
    description: "상세 안내 문구로 그대로 저장/노출 가능합니다.",
  },
  IMGURL: {
    websiteField: "대표 이미지 신규 컬럼",
    status: "부분 가능",
    description: "현재 스키마에 이미지 필드가 없어 추가하면 카드 썸네일로 활용 가능합니다.",
  },
  TELNO: {
    websiteField: "문의전화 신규 컬럼",
    status: "부분 가능",
    description: "현재 구조에는 없어도 되지만 사용자 편의상 컬럼 추가 가치가 큽니다.",
  },
};

async function getSeoulSportRows(): Promise<{ rows: SeoulSportRow[]; rawXml: string; error: string | null }> {
  const apiKey = process.env.SEOUL_OPENAPI_KEY ?? "7248745a74636b733837426b724e4b";
  const url = `http://openapi.seoul.go.kr:8088/${apiKey}/xml/ListPublicReservationSport/1/5/%20/`;

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return { rows: [], rawXml: "", error: `API 요청 실패: ${response.status} ${response.statusText}` };
    }
    const rawXml = await response.text();
    const rows = parseRowsFromXml(rawXml);
    return { rows, rawXml, error: null };
  } catch (error) {
    return {
      rows: [],
      rawXml: "",
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
}

export default async function TestLabPage() {
  const { rows, rawXml, error } = await getSeoulSportRows();
  const oneCourtEntries = parseRowEntries(rawXml);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-6 py-24">
        <h1 className="text-3xl font-bold tracking-tight">테스트 페이지</h1>
        <p className="mt-3 text-sm text-[#B0B0B0]">
          서울시 체육시설 공공서비스 예약 정보 API 연동 테스트 페이지입니다.
        </p>

        <ImportSeoulButton />

        <div className="mt-8 rounded-xl border border-[#2C2C2C] bg-[#141416] p-4">
          <p className="text-xs text-[#8A8F98]">
            요청 주소:
            <span className="ml-2 break-all text-[#C4C7CF]">
              http://openapi.seoul.go.kr:8088/[인증키]/xml/ListPublicReservationSport/1/5/%20/
            </span>
          </p>
          <p className="mt-2 text-xs text-[#8A8F98]">
            결과 건수: <span className="text-[#C4C7CF]">{rows.length}건</span>
          </p>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-700/40 bg-red-950/20 p-4 text-sm text-red-200">
            API 연동 오류: {error}
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-xl border border-[#2C2C2C]">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-[#1A1A1B] text-[#B0B0B0]">
                <tr>
                  <th className="px-4 py-3 font-medium">시설명</th>
                  <th className="px-4 py-3 font-medium">상태</th>
                  <th className="px-4 py-3 font-medium">지역/장소</th>
                  <th className="px-4 py-3 font-medium">접수 기간</th>
                  <th className="px-4 py-3 font-medium">예약 링크</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.svcId} className="border-t border-[#2C2C2C] bg-[#111214] align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{row.svcName || "-"}</p>
                      <p className="mt-1 text-xs text-[#8A8F98]">SVCID: {row.svcId || "-"}</p>
                    </td>
                    <td className="px-4 py-3 text-[#C4C7CF]">{row.svcStatus || "-"}</td>
                    <td className="px-4 py-3 text-[#C4C7CF]">
                      {[row.areaName, row.placeName].filter(Boolean).join(" / ") || "-"}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#C4C7CF]">
                      <p>{row.receiptBeginAt || "-"}</p>
                      <p className="mt-1">{row.receiptEndAt || "-"}</p>
                    </td>
                    <td className="px-4 py-3">
                      {row.reserveUrl ? (
                        <a
                          href={row.reserveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#60A5FA] underline underline-offset-2"
                        >
                          예약 페이지
                        </a>
                      ) : (
                        <span className="text-[#8A8F98]">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <section className="mt-8">
          <h2 className="text-xl font-semibold">테니스장 1건 전체 필드</h2>
          <p className="mt-2 text-sm text-[#8A8F98]">
            API 응답에서 첫 번째 테니스장 row를 기준으로 모든 필드를 출력합니다.
          </p>
          <div className="mt-4 overflow-hidden rounded-xl border border-[#2C2C2C]">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-[#1A1A1B] text-[#B0B0B0]">
                <tr>
                  <th className="px-4 py-3 font-medium">API 필드</th>
                  <th className="px-4 py-3 font-medium">값</th>
                </tr>
              </thead>
              <tbody>
                {oneCourtEntries.map((entry) => (
                  <tr key={entry.key} className="border-t border-[#2C2C2C] bg-[#111214] align-top">
                    <td className="px-4 py-3 font-medium text-white">{entry.key}</td>
                    <td className="px-4 py-3 text-[#C4C7CF] break-all">{entry.value || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">우리 웹사이트와의 매칭 설명</h2>
          <p className="mt-2 text-sm text-[#8A8F98]">
            현재 `Court` 스키마 기준으로 매칭 가능 여부를 정리했습니다.
          </p>
          <div className="mt-4 overflow-hidden rounded-xl border border-[#2C2C2C]">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-[#1A1A1B] text-[#B0B0B0]">
                <tr>
                  <th className="px-4 py-3 font-medium">API 필드</th>
                  <th className="px-4 py-3 font-medium">웹사이트 필드</th>
                  <th className="px-4 py-3 font-medium">매칭</th>
                  <th className="px-4 py-3 font-medium">설명</th>
                </tr>
              </thead>
              <tbody>
                {oneCourtEntries.map((entry) => {
                  const guide = fieldMatchGuide[entry.key];
                  const status = guide?.status ?? "어려움";
                  const statusClass =
                    status === "가능"
                      ? "text-[#4ADE80]"
                      : status === "부분 가능"
                        ? "text-[#FACC15]"
                        : "text-[#F87171]";

                  return (
                    <tr key={`${entry.key}-mapping`} className="border-t border-[#2C2C2C] bg-[#111214] align-top">
                      <td className="px-4 py-3 font-medium text-white">{entry.key}</td>
                      <td className="px-4 py-3 text-[#C4C7CF]">{guide?.websiteField ?? "직접 매핑 필드 없음"}</td>
                      <td className={`px-4 py-3 font-medium ${statusClass}`}>{status}</td>
                      <td className="px-4 py-3 text-[#C4C7CF]">
                        {guide?.description ?? "현재 스키마 기준으로 바로 매핑하기 어려워 전처리 또는 신규 컬럼이 필요합니다."}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <details className="mt-6 rounded-xl border border-[#2C2C2C] bg-[#141416] p-4">
          <summary className="cursor-pointer text-sm text-[#C4C7CF]">원본 XML 보기</summary>
          <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-all text-xs text-[#8A8F98]">
            {rawXml || "원본 XML이 없습니다."}
          </pre>
        </details>
      </div>
    </main>
  );
}
