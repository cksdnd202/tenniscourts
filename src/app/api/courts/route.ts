import { NextRequest, NextResponse } from "next/server";
import {
  getCachedHomeCourts,
  getHomeCourtPage,
  HOME_COURTS_PAGE_SIZE,
  type HomeCourtSort,
} from "@/lib/homeCourtData.server";
import { normalizeSportType, SPORT_SURFACES } from "@/lib/sports";
import type { CourtEnvironment } from "@/lib/courtEnvironment";

const VALID_SORTS = new Set<HomeCourtSort>(["recent", "upcoming", "name"]);
const VALID_COURT_ENVIRONMENTS = new Set<CourtEnvironment>(["indoor", "outdoor"]);
const VALID_FEE_TYPES = new Set(["free", "paid"] as const);

function parseList(value: string | null) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const sportType = normalizeSportType(searchParams.get("sportType"));
    const validCourtTypes = new Set(SPORT_SURFACES[sportType].map((surface) => surface.value));
    const requestedSort = searchParams.get("sort") as HomeCourtSort | null;
    const courtTypes = parseList(searchParams.get("courtTypes")).filter((type) =>
      validCourtTypes.has(type as never)
    );
    const courtEnvironments = parseList(searchParams.get("courtEnvironments")).filter(
      (environment): environment is CourtEnvironment =>
        VALID_COURT_ENVIRONMENTS.has(environment as CourtEnvironment)
    );
    const feeTypes = parseList(searchParams.get("feeTypes")).filter(
      (feeType): feeType is "free" | "paid" =>
        VALID_FEE_TYPES.has(feeType as "free" | "paid")
    );
    const priceMinimum = Number(searchParams.get("priceMin") ?? 0);
    const priceMaximum = Number(searchParams.get("priceMax") ?? 500_000);
    const normalizedPriceRange: [number, number] = [
      Number.isFinite(priceMinimum) ? Math.max(0, priceMinimum) : 0,
      Number.isFinite(priceMaximum) ? Math.max(0, priceMaximum) : 500_000,
    ];
    const allCourts = await getCachedHomeCourts(sportType);
    const page = getHomeCourtPage(allCourts, {
      offset: Number(searchParams.get("offset") ?? 0),
      limit: Number(searchParams.get("limit") ?? HOME_COURTS_PAGE_SIZE),
      region: searchParams.get("region")?.trim() || undefined,
      city: searchParams.get("city")?.trim() || undefined,
      courtTypes,
      courtEnvironments,
      ownerTypes: parseList(searchParams.get("ownerTypes")),
      feeTypes,
      priceRange: normalizedPriceRange[0] <= normalizedPriceRange[1]
        ? normalizedPriceRange
        : [normalizedPriceRange[1], normalizedPriceRange[0]],
      courtIds: parseList(searchParams.get("courtIds")),
      query: searchParams.get("query")?.trim() || undefined,
      sort: requestedSort && VALID_SORTS.has(requestedSort) ? requestedSort : "recent",
    });

    return NextResponse.json(page, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "코트 목록을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
