import type { Court } from "@/app/types";

export function getReservationHref(court: Pick<Court, "id" | "booking_site_link">) {
  if (!court.booking_site_link) return "";
  return `/api/booking/resolve?courtId=${encodeURIComponent(court.id)}`;
}
