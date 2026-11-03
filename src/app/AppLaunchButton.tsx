"use client";
import { trackAppPromotion } from "@/lib/appPromotionAnalytics";
import { usePathname } from "next/navigation";
import { getAndroidAppIntent, getFacilityPlayUrl } from "@/lib/appLaunch";
export function AppLaunchButton({className, source}: {className: string; source: string}) {
  const path = usePathname();
  return <a className={className} href={getFacilityPlayUrl(path)} onClick={(event) => {
    void trackAppPromotion("app_promo_clicked", source, { action: /Android/i.test(navigator.userAgent) ? "app_open_attempt" : "store_open" });
    if (/Android/i.test(navigator.userAgent)) {
      event.preventDefault();
      window.location.href = getAndroidAppIntent(path);
    }
  }}>앱에서 열기</a>;
}
