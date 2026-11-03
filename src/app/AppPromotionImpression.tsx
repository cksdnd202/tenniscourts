"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackAppPromotion } from "@/lib/appPromotionAnalytics";

/** A visible surface counts once per mount and pathname, after 50% is visible. */
export function AppPromotionImpression({ source, children }: { source: string; children: React.ReactNode }) {
 const root = useRef<HTMLSpanElement>(null);
 const path = usePathname();
 const sent = useRef("");
 useEffect(() => {
  const node = root.current;
  if (!node) return;
  let inView = false;
  const capture = () => {
   if (!inView || document.visibilityState !== "visible" || sent.current === path) return;
   sent.current = path;
   void trackAppPromotion("app_promo_viewed", source);
   observer.disconnect();
  };
  const observer = new IntersectionObserver(entries => {
   inView = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .5);
   capture();
  }, { threshold: .5 });
  document.addEventListener("visibilitychange", capture);
  observer.observe(node);
  return () => { observer.disconnect(); document.removeEventListener("visibilitychange", capture); };
 }, [path, source]);
 return <><span aria-hidden="true" style={{position:"absolute",inset:0,pointerEvents:"none"}} ref={root}/>{children}</>;
}

/** Count the QR only once it has finished sliding in, including reduced-motion mode. */
export function AppQrImpression({source}: {source: string}) {
 const root = useRef<HTMLSpanElement>(null);
 useEffect(() => {
  const node = root.current;
  const parent = node?.parentElement;
  if (!node || !parent) return;
  let inView = false;
  let sent = false;
  const capture = () => {
   if (sent || !inView || document.visibilityState !== "visible" || Number(getComputedStyle(parent).opacity) < .99) return;
   sent = true;
   void trackAppPromotion("app_qr_viewed", source);
  };
  const observer = new IntersectionObserver(entries => {
   inView = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .5);
   capture();
  }, {threshold: [.5, 1]});
  observer.observe(node);
  parent.addEventListener("animationend", capture);
  document.addEventListener("visibilitychange", capture);
  return () => { observer.disconnect(); parent.removeEventListener("animationend", capture); document.removeEventListener("visibilitychange", capture); };
 }, [source]);
 return <span ref={root} aria-hidden="true" style={{position:"absolute",inset:0,pointerEvents:"none"}}/>;
}
