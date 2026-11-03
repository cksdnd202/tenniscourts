import type { Metadata } from "next";
import { getAppDestination } from "@/lib/appLaunch";
import { QrStoreRedirect } from "./QrStoreRedirect";
export const metadata: Metadata = { title: "앱 다운로드 | Courts Korea", robots: { index: false, follow: false } };
export default async function Page({searchParams}: { searchParams: Promise<{source?: string; path?: string}> }) {
 const params = await searchParams;
 const source = params.source === "launch_popup" || params.source === "header_qr" ? params.source : "unknown";
 return <QrStoreRedirect source={source} path={getAppDestination(typeof params.path === "string" ? params.path : "/")} />;
}
