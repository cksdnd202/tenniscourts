import { getAllSportCourtSearchIndex } from "@/lib/homeCourtData.server";
import { CourtSearchHeader } from "../CourtSearchHeader";
import { MyPageContent } from "./MyPageContent";

export const revalidate = 60;

export default async function MyPage() {
  const courts = await getAllSportCourtSearchIndex();

  return (
    <>
      <CourtSearchHeader courts={courts} />
      <main className="h-screen overflow-hidden bg-black pt-[73px] text-white">
        <MyPageContent />
      </main>
    </>
  );
}
