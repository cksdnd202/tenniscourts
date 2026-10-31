"use client";
import { usePathname } from "next/navigation";
import { getAndroidAppIntent, getFacilityPlayUrl } from "@/lib/appLaunch";
export function AppLaunchButton({className}: {className: string; source: string}) {
  const path = usePathname();
  return <a className={className} href={getFacilityPlayUrl(path)} onClick={(event) => {
    if (/Android/i.test(navigator.userAgent)) {
      event.preventDefault();
      window.location.href = getAndroidAppIntent(path);
    }
  }}>앱에서 열기</a>;
}
