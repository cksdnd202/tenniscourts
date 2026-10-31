import {
  getAllSportCourtSearchIndex,
  getCachedHomeCourts,
  type HomeCourtSearchItem,
} from "@/lib/homeCourtData.server";
import { SPORT_VENUE_LABELS } from "@/lib/sports";
import { CourtFilter } from "./CourtFilter";
import { CourtSearchHeader } from "./CourtSearchHeader";
import type { Court, SportType } from "./types";

const SITE_URL = "https://courtskorea.com";

export function getSportHomeUrl(sportType: SportType) {
  return `${SITE_URL}/${sportType}`;
}

export async function SportHomePage({
  sportType,
  isBrandHome = false,
}: {
  sportType: SportType;
  isBrandHome?: boolean;
}) {
  let allCourts: Court[];
  let searchCourts: HomeCourtSearchItem[];

  try {
    [allCourts, searchCourts] = await Promise.all([
      getCachedHomeCourts(sportType),
      getAllSportCourtSearchIndex(),
    ]);
  } catch (error) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="mb-4 text-2xl font-bold">🎾 Courts Korea</h1>
        <p className="text-red-600">
          에러: {error instanceof Error ? error.message : `${SPORT_VENUE_LABELS[sportType]} 목록을 불러오지 못했습니다.`}
        </p>
      </main>
    );
  }

  const pageUrl = isBrandHome ? `${SITE_URL}/` : getSportHomeUrl(sportType);
  const pageName = isBrandHome
    ? "전국 스포츠 시설 예약 정보"
    : `한국 ${SPORT_VENUE_LABELS[sportType]} 예약 정보`;
  const collectionPage = {
    "@type": "CollectionPage",
    "@id": `${pageUrl}#webpage`,
    name: pageName,
    url: pageUrl,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    ...(!isBrandHome
      ? {
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: allCourts.length,
            itemListElement: allCourts.slice(0, 50).map((court, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: court.basic_court_name,
              url: `${SITE_URL}/courts/${court.slug || court.id}`,
            })),
          },
        }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              ...(isBrandHome
                ? [
                    {
                      "@type": "WebSite",
                      "@id": `${SITE_URL}/#website`,
                      url: `${SITE_URL}/`,
                      name: "Courts Korea",
                      alternateName: ["코츠 코리아", "courtskorea.com"],
                      inLanguage: "ko-KR",
                    },
                  ]
                : []),
              collectionPage,
            ],
          }).replace(/</g, "\\u003c"),
        }}
      />
      <h1 className="sr-only">
        {isBrandHome
          ? "전국 스포츠 시설 예약 및 이용 정보"
          : `전국 ${SPORT_VENUE_LABELS[sportType]} 예약 및 이용 정보`}
      </h1>
      <CourtSearchHeader courts={searchCourts} sportType={sportType} />
      <main className="mx-auto flex h-screen w-auto flex-col overflow-hidden bg-[#000000] pt-[73px]">
        <CourtFilter key={sportType} courts={allCourts} sportType={sportType} showViewToggle />
      </main>
    </>
  );
}
