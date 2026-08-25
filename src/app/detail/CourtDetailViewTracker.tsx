"use client";

import { useEffect } from "react";
import { capturePostHogEvent } from "@/lib/posthogClient";

type Props = {
  courtId: string;
  courtName?: string | null;
  ownerType?: string | null;
  region?: string | null;
  city?: string | null;
};

export function CourtDetailViewTracker({ courtId, courtName, ownerType, region, city }: Props) {
  useEffect(() => {
    capturePostHogEvent("court_detail_viewed", {
      courtId,
      courtName,
      ownerType,
      region,
      city,
      source: "detail_page",
    });
  }, [city, courtId, courtName, ownerType, region]);

  return null;
}
