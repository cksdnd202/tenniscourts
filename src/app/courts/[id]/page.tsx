import { normalizeCourtDescription } from "@/lib/normalizeCourtDescription";
import { supabase } from "@/lib/supabase";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { buildCourtDetailMetadata } from "@/lib/courtSeo";
import { getCourtDetailPath } from "@/lib/courtPath";
import { getSlugRedirectCandidates, removeMonthlySlugToken } from "@/lib/slugRedirect";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import type { Court, CourtBlogLink } from "../../types";
import { CourtSearchHeader } from "../../CourtSearchHeader";
import { CourtDetailBookingSection } from "../../detail/CourtDetailBookingSection";
import { AppReminderCard } from "../../detail/AppReminderCard";
import { getNextBookingRuleOpen } from "@/lib/nextBookingOpen";
import { CourtDetailAddress, CourtDetailTable, CourtDetailMap } from "../../detail/CourtDetailCommon";
import { CourtDetailAside, CourtDetailMobileBookBar } from "../../detail/CourtDetailAside";
import { CourtFeesSection } from "../../detail/CourtFeesSection";
import { CourtAmenitiesSection } from "../../detail/CourtAmenitiesSection";
import { CourtDetailViewTracker } from "../../detail/CourtDetailViewTracker";
import { CourtDetailAppReady } from "../../detail/CourtDetailAppReady";
import { RecentCourtViewTracker } from "../../detail/RecentCourtViewTracker";
import { ShareButton } from "../../detail/ShareButton";
import { InstagramReviewBanner } from "../../detail/InstagramReviewBanner";
import {
  detailDividerSectionStyle,
  detailSectionTitle,
  detailSectionTitleStyle,
} from "../../detail/detailLayoutStyles";
import { FavoriteButton } from "../../FavoriteButton";
import { getSportVenueLabel, normalizeSportType } from "@/lib/sports";
import { getAllSportCourtSearchIndex } from "@/lib/homeCourtData.server";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ id: string }>;
};

type RelatedCourt = Pick<
  Court,
  | "id"
  | "slug"
  | "basic_court_name"
  | "basic_owner_type"
  | "basic_region"
  | "basic_city"
  | "booking_rule_type"
  | "booking_open_type"
>;

const siteUrl = "https://courtskorea.com";
const ogImage = "/courtskroea_ogimg.png?v=20260323-1";

const METADATA_COURT_SELECT =
  "id, sport_type, slug, basic_region, basic_city, basic_address, basic_court_name, booking_rule_type, booking_open_type, booking_eligibility_first, booking_open_day_of_month, booking_open_day_of_week, booking_open_ordinal, booking_open_day_owner, booking_open_time_owner, booking_open_day_normal, booking_open_time_normal, booking_normal_iscurrentmonth, booking_open_offset";

const DETAIL_COURT_SELECT =
  "id, sport_type, slug, use_or_not, basic_court_name, instagram_hashtag, basic_owner_type, basic_address, basic_region, basic_city, time_of_use_same, basic_time_of_use_weekend_from, basic_time_of_use_weekend_to, basic_time_of_use_weekday_from, basic_time_of_use_weekday_to, booking_site_link, booking_reception_time, booking_rule_type, booking_lottery_desc, booking_open_type, booking_eligibility_first, booking_eligibility_second, booking_open_day_of_month, booking_open_day_of_week, booking_open_ordinal, booking_open_day_owner, booking_open_time_owner, booking_open_day_normal, booking_open_time_normal, booking_normal_iscurrentmonth, booking_open_offset, court_count_hard_indoor, court_count_hard_outdoor, court_count_grass_indoor, court_count_grass_outdoor, court_count_clay_indoor, court_count_clay_outdoor, basic_map_link, basic_latitude, basic_longitude, booking_booking_provide, etc_desc, court_surface_counts(id, court_id, surface_type, indoor_count, outdoor_count)";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function fetchCourtByRouteKey(routeKey: string, selectFields: string) {
  const { data: slugData, error: slugError } = await supabase
    .from("courtinfo")
    .select(selectFields)
    .eq("use_or_not", true)
    .eq("slug", routeKey)
    .maybeSingle();

  if (slugData || slugError) return { data: slugData, error: slugError };

  const { data: aliasData, error: aliasError } = await getSupabaseAdmin()
    .from("court_slug_aliases")
    .select("court_id")
    .eq("slug", routeKey)
    .maybeSingle();

  if (aliasError) return { data: null, error: aliasError };
  if (aliasData?.court_id) {
    const { data: aliasCourtData, error: aliasCourtError } = await supabase
      .from("courtinfo")
      .select(selectFields)
      .eq("use_or_not", true)
      .eq("id", aliasData.court_id)
      .maybeSingle();

    if (aliasCourtData || aliasCourtError) {
      return { data: aliasCourtData, error: aliasCourtError };
    }
  }

  if (UUID_PATTERN.test(routeKey)) {
    const { data: idData, error: idError } = await supabase
      .from("courtinfo")
      .select(selectFields)
      .eq("use_or_not", true)
      .eq("id", routeKey)
      .maybeSingle();

    if (idData || idError) return { data: idData, error: idError };
  }

  for (const candidate of getSlugRedirectCandidates(routeKey)) {
    const { data: candidateData, error: candidateError } = await supabase
      .from("courtinfo")
      .select(selectFields)
      .eq("use_or_not", true)
      .eq("slug", candidate)
      .maybeSingle();

    if (candidateData || candidateError) {
      return { data: candidateData, error: candidateError };
    }
  }

  if (removeMonthlySlugToken(routeKey) === routeKey) {
    const { data: monthlySlugRows, error: monthlySlugError } = await supabase
      .from("courtinfo")
      .select(selectFields)
      .eq("use_or_not", true)
      .not("slug", "is", null);

    if (monthlySlugError) return { data: null, error: monthlySlugError };

    const reverseMatchedCourt =
      (monthlySlugRows as Array<{ slug?: string | null }> | null)?.find(
        (row) => removeMonthlySlugToken(String(row.slug ?? "")) === routeKey
      ) ?? null;

    if (reverseMatchedCourt) return { data: reverseMatchedCourt, error: null };
  }

  return { data: null, error: null };
}

function getCanonicalCourtPath(court: Court) {
  if (court.slug?.trim()) {
    const canonicalSlug = removeMonthlySlugToken(court.slug.trim());
    if (canonicalSlug) return `/courts/${canonicalSlug}`;
  }

  return getCourtDetailPath(court);
}

async function attachActiveBookingRules(court: Court) {
  const { data: bookingRulesData } = await getSupabaseAdmin()
    .from("court_booking_rules")
    .select("*")
    .eq("court_id", court.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return {
    ...court,
    court_booking_rules: (bookingRulesData ?? []) as NonNullable<Court["court_booking_rules"]>,
  };
}

async function attachBookingRuleFees(court: Court) {
  const bookingRuleIds = (court.court_booking_rules ?? []).map((rule) => rule.id);
  if (bookingRuleIds.length === 0) {
    return { ...court, court_booking_rule_fees: [] };
  }

  const { data: feeData } = await supabase
    .from("court_booking_rule_fees")
    .select("*")
    .in("booking_rule_id", bookingRuleIds);

  return {
    ...court,
    court_booking_rule_fees: (feeData ?? []) as NonNullable<
      Court["court_booking_rule_fees"]
    >,
  };
}

async function attachCourtAmenities(court: Court) {
  const { data: amenityData, error } = await getSupabaseAdmin()
    .from("court_amenities")
    .select("court_id, amenity_key, status, checked_at")
    .eq("court_id", court.id)
    .eq("status", "present");

  if (error) {
    console.error("편의시설 정보를 불러오지 못했습니다:", error.message);
    return { ...court, court_amenities: [] };
  }

  return {
    ...court,
    court_amenities: (amenityData ?? []) as NonNullable<Court["court_amenities"]>,
  };
}

function RelatedReservationInfo({ courts, venueLabel }: { courts: RelatedCourt[]; venueLabel: string }) {
  if (courts.length === 0) return null;

  return (
    <section data-detail-related="true" style={detailDividerSectionStyle}>
      <h2
        className={detailSectionTitle}
        style={{ ...detailSectionTitleStyle, marginBottom: "24px" }}
      >
        이 {venueLabel}의 다른 예약 정보
      </h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {courts.map((relatedCourt) => {
          const region = [relatedCourt.basic_region, relatedCourt.basic_city]
            .filter(Boolean)
            .join(" ");

          return (
            <a
              key={relatedCourt.id}
              href={getCourtDetailPath(relatedCourt)}
              className="group rounded-xl border border-[#2C2C2C] bg-[#1A1A1B] px-4 py-3 transition hover:bg-[#252528]"
            >
              <span className="block min-w-0 text-sm font-semibold text-white group-hover:underline">
                {relatedCourt.basic_court_name ?? "이름 없음"}
              </span>
              {region ? (
                <p className="mt-1 truncate text-xs text-[#B0B0B0]">{region}</p>
              ) : null}
            </a>
          );
        })}
      </div>
    </section>
  );
}

function CourtBlogLinks({
  links,
  courtId,
  courtName,
  isBadminton,
}: {
  links: CourtBlogLink[];
  courtId: string;
  courtName?: string | null;
  isBadminton: boolean;
}) {
  return (
    <section
      data-detail-reviews="true"
      style={{ display: "flex", flexDirection: "column", rowGap: links.length > 0 ? "24px" : 0 }}
    >
      <h2 className={detailSectionTitle} style={detailSectionTitleStyle}>방문 후기</h2>
      {links.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-3">
          {links.map((link) => (
            <a
              key={link.id ?? link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              data-ph-event="detail_blog_clicked"
              data-court-id={courtId}
              data-court-name={courtName ?? undefined}
              data-blog-url={link.url}
              data-blog-title={link.title ?? "블로그 후기 보기"}
              data-blog-source={link.source ?? "unknown"}
              className="group overflow-hidden rounded-xl border border-[#2C2C2C] bg-[#1A1A1B] transition hover:bg-[#252528]"
            >
              <div className="aspect-[16/9] bg-[#242426]">
                {link.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={link.thumbnail_url}
                    alt=""
                    className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-[#777]">
                    이미지 없음
                  </div>
                )}
              </div>
              <div className="space-y-2 p-4">
                {link.source ? (
                  <p
                    className={`${isBadminton ? "text-[#337DFF]" : "text-[#6FCF97]"} truncate text-xs font-medium`}
                    style={{ color: isBadminton ? "#337DFF" : "#6FCF97" }}
                  >
                    {link.source}
                  </p>
                ) : null}
                <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-white group-hover:underline">
                  {link.title ?? "블로그 후기 보기"}
                </h3>
                {link.description ? (
                  <p className="line-clamp-2 text-xs leading-5 text-[#B0B0B0]">
                    {link.description}
                  </p>
                ) : null}
              </div>
            </a>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id: routeKey } = await params;
  const { data } = await fetchCourtByRouteKey(routeKey, METADATA_COURT_SELECT);
  const court = data ? await attachActiveBookingRules(data as Court) : null;
  if (!court) return { title: "시설을 찾을 수 없습니다 | Courts Korea", robots: { index: false, follow: false } };

  const { title, description } = court
    ? buildCourtDetailMetadata(court)
    : {
        title: `코트 예약 방법·오픈 시간 | Courts Korea`,
        description:
          "체육시설의 예약 오픈 시간, 주소, 코트 종류, 예약 사이트 정보를 확인하세요.",
      };
  const pageUrl = court ? `${siteUrl}${getCanonicalCourtPath(court)}` : `${siteUrl}/courts/${routeKey}`;

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: "website",
      siteName: "Courts Korea",
      locale: "ko_KR",
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function CourtDetailPage({ params }: PageProps) {
  const { id: routeKey } = await params;

  const detailRes = await fetchCourtByRouteKey(routeKey, DETAIL_COURT_SELECT);

  const detailData = detailRes.data;
  const detailError = detailRes.error;
  let court = detailData as Court | null;

  const slugRedirectCandidate = getSlugRedirectCandidates(routeKey)[0];
  if (court && slugRedirectCandidate) {
    permanentRedirect(`/courts/${slugRedirectCandidate}`);
  }

  if (court?.slug && court.slug !== routeKey) {
    const canonicalPath = getCanonicalCourtPath(court);
    if (canonicalPath !== `/courts/${routeKey}`) {
      permanentRedirect(canonicalPath);
    }
  }

  if (detailError) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-4 text-2xl font-bold">코트 정보를 불러오는 중 오류가 발생했습니다.</h1>
        <p className="text-sm text-red-600">{detailError.message}</p>
      </main>
    );
  }

  if (!court) notFound();

  court = await attachActiveBookingRules(court);
  court = await attachBookingRuleFees(court);
  court = await attachCourtAmenities(court);
  const hasVisibleAmenities = (court.court_amenities ?? []).some(
    (amenity) => amenity.status === "present"
  );
  const sportType = normalizeSportType(court.sport_type);
  const venueLabel = getSportVenueLabel(sportType);
  const isBadminton = sportType === "badminton";
  const detailThemeStyle = {
    "--sport-accent": isBadminton ? "#337DFF" : "#6FCF97",
    "--sport-primary": isBadminton ? "#375AE6" : "#2C8B56",
    "--sport-primary-hover": isBadminton ? "#2F4ECC" : "#53A978",
    "--sport-primary-contrast": "#FFFFFF",
    "--sport-detail-accent": isBadminton ? "#337DFF" : "#4ADE80",
    "--sport-detail-primary": isBadminton ? "#375AE6" : "#4ADE80",
    "--sport-detail-primary-hover": isBadminton ? "#2F4ECC" : "#3FCF6F",
    "--sport-detail-primary-contrast": isBadminton ? "#FFFFFF" : "#000000",
  } as CSSProperties;
  const courtsForSearch = await getAllSportCourtSearchIndex();

  let relatedCourts: RelatedCourt[] = [];
  let blogLinks: CourtBlogLink[] = [];
  const mapLink = court.basic_map_link?.trim();
  if (mapLink) {
    const { data: relatedData } = await supabase
      .from("courtinfo")
      .select(
        "id, slug, basic_court_name, basic_owner_type, basic_region, basic_city, booking_rule_type, booking_open_type"
      )
      .eq("sport_type", sportType)
      .eq("use_or_not", true)
      .eq("basic_map_link", mapLink)
      .neq("id", court.id)
      .order("basic_court_name", { ascending: true });

    relatedCourts = (relatedData ?? []) as RelatedCourt[];
  }

  const { data: blogLinkData } = await supabase
    .from("court_blog_links")
    .select("*")
    .eq("court_id", court.id)
    .order("sort_order", { ascending: true })
    .limit(3);

  blogLinks = (blogLinkData ?? []) as CourtBlogLink[];

  return (
    <div data-detail-sport={sportType} style={detailThemeStyle}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "SportsActivityLocation",
        "@id": `${siteUrl}${getCanonicalCourtPath(court)}#facility`,
        name: court.basic_court_name, url: `${siteUrl}${getCanonicalCourtPath(court)}`,
        description: buildCourtDetailMetadata(court).description,
        ...(court.basic_address ? { address: { "@type": "PostalAddress", streetAddress: court.basic_address,
          addressLocality: court.basic_city || undefined, addressRegion: court.basic_region || undefined, addressCountry: "KR" } } : {}),
        ...(court.basic_latitude != null && court.basic_longitude != null ? { geo: { "@type": "GeoCoordinates", latitude: court.basic_latitude, longitude: court.basic_longitude } } : {})
      }).replace(/</g, "\\u003c") }} />
      <RecentCourtViewTracker courtId={court.id} />
      <CourtDetailAppReady />
      <CourtDetailViewTracker
        courtId={court.id}
        courtName={court.basic_court_name}
        ownerType={court.basic_owner_type}
        region={court.basic_region}
        city={court.basic_city}
      />
      <CourtSearchHeader courts={courtsForSearch} sportType={sportType} />

      {/* 헤더 검색창과 동일하게 1032px 이상에서만 2열 + 우측 사이드 표시 (lg=1024만 쓰면 사이드바가 비는 구간 발생) */}
      <main data-detail-page="true" className="min-h-screen overflow-x-hidden bg-black pb-44 pt-[73px] min-[1032px]:pb-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 min-[1032px]:px-8 py-6 min-[1032px]:py-8">
          <div className="min-[1032px]:grid min-[1032px]:grid-cols-12 min-[1032px]:gap-8 min-[1032px]:items-stretch">
            {/* 좌측 메인 (~70–75%) */}
            <div
              data-detail-sections="true"
              className="flex min-w-0 flex-col min-[1032px]:col-span-8 xl:col-span-9"
              style={{ display: "flex", flexDirection: "column" }}
            >
              <div data-detail-hero="true" className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <h1 data-detail-title="true" className="min-w-0 text-2xl sm:text-3xl font-bold leading-tight text-white break-keep">
                    {court.basic_court_name ?? "(이름 없음)"}
                  </h1>
                  {court.basic_owner_type ? (
                    <span className="rounded text-xs font-medium text-white px-2 py-1 bg-[#2C2C2C] flex-shrink-0 whitespace-nowrap">
                      {court.basic_owner_type}
                    </span>
                  ) : null}
                </div>
                <div data-detail-actions="true" className="inline-flex flex-shrink-0 items-center gap-2">
                  <ShareButton title={court.basic_court_name ?? "Courts Korea"} />
                  <FavoriteButton
                    courtId={court.id}
                    source="detail_page"
                    accentColor={isBadminton ? "#337DFF" : undefined}
                  />
                </div>
              </div>

              <section
                aria-label="예약 오픈 정보"
                data-detail-booking="true"
                style={{ marginTop: "56px" }}
              >
                <h2
                  className={detailSectionTitle}
                  style={{ ...detailSectionTitleStyle, marginBottom: "24px" }}
                >
                  예약 오픈 정보
                </h2>
                <CourtDetailBookingSection court={court} />
                {sportType === "tennis" && court.booking_rule_type !== "outdoor_open"
                  && court.court_booking_rules?.some((rule) =>
                    rule.is_active && getNextBookingRuleOpen(court, rule) !== null
                  ) ? <AppReminderCard /> : null}
              </section>

              <section
                aria-label="위치 정보"
                data-detail-location="true"
                style={detailDividerSectionStyle}
              >
                <h2
                  className={detailSectionTitle}
                  style={{ ...detailSectionTitleStyle, marginBottom: "24px" }}
                >
                  위치
                </h2>
                <div style={{ display: "flex", flexDirection: "column", rowGap: "20px" }}>
                  <CourtDetailAddress court={court} showNearbyAction />
                  <CourtDetailMap court={court} showResetControl />
                </div>
              </section>

              <CourtFeesSection court={court} />

              <section data-detail-court-types="true" style={detailDividerSectionStyle}>
                <h2
                  className={detailSectionTitle}
                  style={{ ...detailSectionTitleStyle, marginBottom: "24px" }}
                >
                  {sportType === "badminton" ? "바닥 종류" : "코트 종류"}
                </h2>
                <CourtDetailTable court={court} />
              </section>

              {hasVisibleAmenities ? (
                <CourtAmenitiesSection
                  amenities={court.court_amenities}
                  courtId={court.id}
                  courtName={court.basic_court_name ?? "이름 없음"}
                  sportType={sportType}
                />
              ) : null}

              <div
                data-detail-review-links="true"
                style={{
                  ...detailDividerSectionStyle,
                  display: "flex",
                  flexDirection: "column",
                  rowGap: blogLinks.length > 0 ? "12px" : "24px",
                }}
              >
                <CourtBlogLinks
                  links={blogLinks}
                  courtId={court.id}
                  courtName={court.basic_court_name}
                  isBadminton={isBadminton}
                />

                <InstagramReviewBanner
                  courtId={court.id}
                  courtName={court.basic_court_name}
                  hashtag={court.instagram_hashtag}
                />
              </div>

              <RelatedReservationInfo courts={relatedCourts} venueLabel={venueLabel} />

              <section data-detail-extra="true" style={detailDividerSectionStyle}>
                <h2
                  className={detailSectionTitle}
                  style={{ ...detailSectionTitleStyle, marginBottom: "24px" }}
                >
                  부가 정보
                </h2>
                <div className="min-h-[120px] max-w-full overflow-hidden whitespace-pre-wrap break-words rounded-xl border border-[#2C2C2C] bg-[#1A1A1B] px-4 py-4 text-sm text-[#B0B0B0] [overflow-wrap:anywhere]">
                  {normalizeCourtDescription(court.etc_desc) || "등록된 부가 정보가 없습니다."}
                </div>
              </section>
            </div>

            {/* 우측 사이드바 (~25–30%), 1032px 이상만 */}
            <div className="hidden min-[1032px]:block min-[1032px]:col-span-4 xl:col-span-3 min-w-0">
              <CourtDetailAside court={court} />
            </div>
          </div>
        </div>
      </main>

      <CourtDetailMobileBookBar court={court} />
    </div>
  );
}
