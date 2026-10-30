import { NextRequest, NextResponse } from "next/server";

import {
  getCachedHomeCourts,
  getNearbyHomeCourtPage,
  HOME_COURTS_PAGE_SIZE,
} from "@/lib/homeCourtData.server";
import { normalizeSportType, SPORT_SURFACES } from "@/lib/sports";
import type { CourtEnvironment } from "@/lib/courtEnvironment";

type NearbyRequest = {
  latitude?: unknown;
  longitude?: unknown;
  offset?: unknown;
  limit?: unknown;
  region?: unknown;
  city?: unknown;
  courtTypes?: unknown;
  courtEnvironments?: unknown;
  ownerTypes?: unknown;
  feeTypes?: unknown;
  priceRange?: unknown;
  courtIds?: unknown;
  sportType?: unknown;
};

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

const VALID_COURT_ENVIRONMENTS = new Set<CourtEnvironment>(["indoor", "outdoor"]);
const VALID_FEE_TYPES = new Set(["free", "paid"] as const);

function numberRange(value: unknown): [number, number] {
  if (!Array.isArray(value) || value.length !== 2) return [0, 500_000];
  const first = Number(value[0]);
  const second = Number(value[1]);
  const minimum = Number.isFinite(first) ? Math.max(0, first) : 0;
  const maximum = Number.isFinite(second) ? Math.max(0, second) : 500_000;
  return minimum <= maximum ? [minimum, maximum] : [maximum, minimum];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null) as NearbyRequest | null;
    const latitude = Number(body?.latitude);
    const longitude = Number(body?.longitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: "현재 위치 좌표가 올바르지 않습니다." }, { status: 400 });
    }

    const sportType = normalizeSportType(body?.sportType);
    const validCourtTypes = new Set(SPORT_SURFACES[sportType].map((surface) => surface.value));
    const courts = await getCachedHomeCourts(sportType);
    const page = getNearbyHomeCourtPage(courts, {
      latitude,
      longitude,
      offset: Number(body?.offset ?? 0),
      limit: Number(body?.limit ?? HOME_COURTS_PAGE_SIZE),
      region: typeof body?.region === "string" ? body.region.trim() || undefined : undefined,
      city: typeof body?.city === "string" ? body.city.trim() || undefined : undefined,
      courtTypes: stringArray(body?.courtTypes).filter((value) => validCourtTypes.has(value as never)),
      courtEnvironments: stringArray(body?.courtEnvironments).filter(
        (environment): environment is CourtEnvironment =>
          VALID_COURT_ENVIRONMENTS.has(environment as CourtEnvironment)
      ),
      ownerTypes: stringArray(body?.ownerTypes),
      feeTypes: stringArray(body?.feeTypes).filter(
        (feeType): feeType is "free" | "paid" =>
          VALID_FEE_TYPES.has(feeType as "free" | "paid")
      ),
      priceRange: numberRange(body?.priceRange),
      courtIds: stringArray(body?.courtIds),
    });

    return NextResponse.json(page, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "가까운 체육시설을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
