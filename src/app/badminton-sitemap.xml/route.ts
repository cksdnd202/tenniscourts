import { getCachedHomeCourts } from "@/lib/homeCourtData.server";
import { getCourtDetailPath } from "@/lib/courtPath";

export const revalidate = 3600;

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export async function GET() {
  const courts = await getCachedHomeCourts("badminton");
  const urls = new Set([
    "https://courtskorea.com/badminton",
    ...courts.map((court) => `https://courtskorea.com${getCourtDetailPath(court)}`),
  ]);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...urls].map((url) => `<url><loc>${escapeXml(url)}</loc></url>`).join("")}</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=60" } });
}
