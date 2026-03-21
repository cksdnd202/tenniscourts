import { NextRequest, NextResponse } from "next/server";

function toIcsUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const title = sp.get("title") ?? "테니스 예약 오픈";
  const description = sp.get("description") ?? "";
  const location = sp.get("location") ?? "";
  const startRaw = sp.get("start");
  const durationMin = Number(sp.get("durationMin") ?? "10");

  if (!startRaw) {
    return NextResponse.json({ error: "start is required" }, { status: 400 });
  }

  const start = new Date(startRaw);
  if (Number.isNaN(start.getTime())) {
    return NextResponse.json({ error: "invalid start" }, { status: 400 });
  }

  const safeDuration = Number.isFinite(durationMin) && durationMin > 0 ? durationMin : 10;
  const end = new Date(start.getTime() + safeDuration * 60 * 1000);
  const uid = `tennis-${start.getTime()}-${Math.random().toString(36).slice(2)}@ground-korea`;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GROUND KOREA//Tennis Booking//KO",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toIcsUtc(new Date())}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `LOCATION:${escapeIcsText(location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");

  const filename = "booking-open.ics";
  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

