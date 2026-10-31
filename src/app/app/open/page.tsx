import type { Metadata } from "next";
import { AppLaunchPanel } from "../../AppLaunchPanel";
import { getAppDestination } from "@/lib/appLaunch";
import styles from "../../AppLaunchPanel.module.css";

export const metadata: Metadata = { title: "앱으로 이어서 보기 | Courts Korea", robots: { index: false, follow: false } };

export default async function AppOpenPage({ searchParams }: { searchParams: Promise<{ path?: string | string[]; attempted?: string }> }) {
  const params = await searchParams;
  const path = getAppDestination(typeof params.path === "string" ? params.path : null);
  return <main className={styles.page}><AppLaunchPanel path={path} attempted={params.attempted === "1"} /></main>;
}
