"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { isAppWebView } from "@/lib/posthogClient";
import { getPublicPlayUrl } from "@/lib/appLaunch";
const subscribe = () => () => undefined;
export function HeaderAppDownload({mobile = false}: {mobile?: boolean}) {
 const path = usePathname();
 const hidden = useSyncExternalStore(subscribe, () => isAppWebView() || document.documentElement.dataset.courtsKoreaApp === "true" || new URLSearchParams(location.search).get("app") === "1", () => true);
 const [open,setOpen] = useState(false);
 const root = useRef<HTMLSpanElement>(null);
 useEffect(() => {
   if (!open) return;
   const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
   const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
   document.addEventListener("pointerdown", outside);
   document.addEventListener("keydown", escape);
   return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
 }, [open]);
 if(hidden || path.startsWith("/map")) return null;
 return <span ref={root} data-app-download-header className={mobile ? "relative ml-auto" : "relative"}>
 <a href={getPublicPlayUrl()} aria-expanded={open} aria-controls={open ? (mobile ? "app-qr-mobile" : "app-qr-desktop") : undefined} className={mobile ? "inline-flex whitespace-nowrap rounded-full bg-[#292b2e] px-3 py-2 text-xs font-semibold text-white" : "inline-flex min-w-[88px] items-center justify-center whitespace-nowrap rounded-full bg-[#292b2e] px-6 py-2.5 text-sm font-bold text-white"} onClick={event => {
 if (!/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && !(navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {event.preventDefault();setOpen(value => !value);}
 }}>앱 다운로드</a>
 {open && <div id={mobile ? "app-qr-mobile" : "app-qr-desktop"} role="region" aria-label="앱 다운로드 QR코드" className="absolute right-0 top-[calc(100%+16px)] z-[100] w-[410px] rounded-[24px] border border-[#e2e3e5] bg-[#f4f5f6] p-6 text-[#202328] shadow-xl" style={{fontFamily:"var(--font-pretendard), sans-serif"}}>
 <button type="button" aria-label="QR코드 닫기" className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-[#e6e7ea] text-xl" onClick={()=>setOpen(false)}>×</button>
 <div className="flex items-end gap-4"><QRCodeSVG value={getPublicPlayUrl()} size={120} marginSize={2} style={{flexShrink:0}}/><p className="pb-1 text-left text-sm font-medium leading-relaxed">QR코드를 스캔하면<br/><span className="whitespace-nowrap">Courts Korea 앱을 설치할 수 있어요.</span></p></div>
 </div>}
 </span>;
}
