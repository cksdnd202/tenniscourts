import { supabase } from "@/lib/supabase";
import { CourtSearchHeader } from "../CourtSearchHeader";
import type { Court } from "../types";
import { MyPageContent } from "./MyPageContent";

export const revalidate = 60;

export default async function MyPage() {
  const { data } = await supabase
    .from("courtinfo")
    .select("id, slug, basic_court_name, basic_region, basic_city")
    .eq("use_or_not", true)
    .order("basic_court_name", { ascending: true })
    .limit(50);

  const courts = (data ?? []) as Court[];

  return (
    <>
      <CourtSearchHeader courts={courts} />
      <main className="h-screen overflow-hidden bg-black pt-[73px] text-white">
        <MyPageContent />
      </main>
    </>
  );
}
