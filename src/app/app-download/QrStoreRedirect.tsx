"use client";
import { useEffect, useRef } from "react";
import { getAttributedPlayUrl } from "@/lib/appLaunch";
import { trackAppPromotion } from "@/lib/appPromotionAnalytics";
export function QrStoreRedirect({source,path}: {source: string; path: string}) {
 const recorded = useRef<Promise<void> | null>(null);
 const target = getAttributedPlayUrl(source);
 useEffect(() => {
  let active = true;
  const record = recorded.current ??= trackAppPromotion("app_qr_opened", source, { origin_path: path, facility_path: path.startsWith("/courts/") ? path : "" });
  // The analytics helper has a fixed 1.2 second upper bound, including blocked tags.
  void record.then(() => { if (active) location.replace(target); });
  return () => { active = false; };
 }, [path, source, target]);
 return <main style={{maxWidth:420,margin:"80px auto",padding:24,textAlign:"center"}}><h1 style={{fontSize:20}}>Google Play로 이동하고 있어요</h1><p style={{marginTop:16}}>자동으로 이동하지 않으면 아래 버튼을 눌러 주세요.</p><a href={target} style={{display:"block",background:"#30C27C",color:"white",borderRadius:24,padding:14,marginTop:24}}>Google Play에서 다운로드</a></main>;
}
