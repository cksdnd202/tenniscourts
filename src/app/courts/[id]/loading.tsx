export default function CourtDetailLoading() {
  return (
    <main className="min-h-screen bg-black pt-[73px] pb-44 min-[1032px]:pb-10">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 min-[1032px]:px-8 min-[1032px]:py-8">
        <div className="min-[1032px]:grid min-[1032px]:grid-cols-12 min-[1032px]:gap-8">
          <div className="min-w-0 space-y-6 min-[1032px]:col-span-8 xl:col-span-9">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-3">
                <div className="h-9 w-3/4 max-w-lg animate-pulse rounded-md bg-[#242426]" />
                <div className="h-6 w-20 animate-pulse rounded bg-[#242426]" />
              </div>
              <div className="h-8 w-8 shrink-0 animate-pulse rounded-md bg-[#242426]" />
            </div>

            <section className="space-y-4">
              <div className="h-24 animate-pulse rounded-xl border border-[#2C2C2C] bg-[#191B1E]" />
              <div className="h-24 animate-pulse rounded-xl border border-[#2C2C2C] bg-[#191B1E]" />
            </section>

            <section className="space-y-3">
              <div className="h-6 w-2/3 animate-pulse rounded bg-[#242426]" />
              <div className="h-[300px] animate-pulse rounded-lg bg-[#2C2C2C]" />
            </section>

            <section className="space-y-3">
              <div className="h-6 w-16 animate-pulse rounded bg-[#242426]" />
              <div className="h-44 animate-pulse rounded-xl border border-[#2C2C2C] bg-[#191B1E]" />
            </section>
          </div>

          <aside className="mt-8 hidden min-[1032px]:col-span-4 min-[1032px]:mt-0 min-[1032px]:block xl:col-span-3">
            <div className="sticky top-[105px] space-y-4">
              <div className="h-64 animate-pulse rounded-2xl border border-[#2C2C2C] bg-[#191B1E]" />
              <div className="h-12 animate-pulse rounded-xl bg-[#2C8B56]/40" />
            </div>
          </aside>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#2C2C2C] bg-black px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] min-[1032px]:hidden">
        <div className="mb-3 flex gap-3 overflow-hidden">
          <div className="h-24 min-w-[82%] animate-pulse rounded-xl border border-[#2C2C2C] bg-[#191B1E]" />
          <div className="h-24 min-w-[82%] animate-pulse rounded-xl border border-[#2C2C2C] bg-[#191B1E]" />
        </div>
        <div className="h-12 animate-pulse rounded-xl bg-[#2C8B56]/40" />
      </div>
    </main>
  );
}
