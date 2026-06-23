import { getAnalyticsSummary } from "@/lib/ga4";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const numberFormatter = new Intl.NumberFormat("ko-KR");

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <section className="rounded-lg border border-[#2f2f2f] bg-[#151515] p-5">
      <p className="text-sm text-[#a7a7a7]">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{formatNumber(value)}</p>
    </section>
  );
}

function Table({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: Array<Array<string | number>>;
}) {
  return (
    <section className="rounded-lg border border-[#2f2f2f] bg-[#151515]">
      <div className="border-b border-[#2f2f2f] px-5 py-4">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-[#202020] text-[#a7a7a7]">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-5 py-3 font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2f2f2f]">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={`${rowIndex}-${cellIndex}`}
                    className="max-w-[360px] truncate px-5 py-3 text-[#f4f4f4]"
                    title={String(cell)}
                  >
                    {typeof cell === "number" ? formatNumber(cell) : cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function AnalyticsAdminPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  let summary;
  let errorMessage: string | null = null;

  try {
    summary = await getAnalyticsSummary();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "GA4 데이터를 불러오지 못했습니다.";
  }

  return (
    <main className="min-h-screen bg-black px-5 py-8 text-white md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header>
          <p className="text-sm text-[#a7a7a7]">최근 7일 GA4 데이터</p>
          <h1 className="mt-2 text-3xl font-semibold">Courts Korea Analytics</h1>
        </header>

        {errorMessage ? (
          <section className="rounded-lg border border-[#533] bg-[#211] p-5 text-sm leading-6 text-[#ffd6d6]">
            <p className="font-semibold text-white">GA4 연결 확인이 필요합니다.</p>
            <p className="mt-2">{errorMessage}</p>
          </section>
        ) : null}

        {summary ? (
          <>
            <div className="grid gap-3 md:grid-cols-5">
              <StatCard label="활성 사용자" value={summary.totals.activeUsers} />
              <StatCard label="신규 사용자" value={summary.totals.newUsers} />
              <StatCard label="세션" value={summary.totals.sessions} />
              <StatCard label="페이지 조회" value={summary.totals.screenPageViews} />
              <StatCard label="이벤트" value={summary.totals.eventCount} />
            </div>

            <Table
              title="일별 사용자"
              headers={["날짜", "활성 사용자", "페이지 조회"]}
              rows={summary.dailyUsers.map((row) => [
                row.date,
                row.activeUsers,
                row.screenPageViews,
              ])}
            />

            <Table
              title="인기 페이지"
              headers={["경로", "제목", "페이지 조회", "활성 사용자"]}
              rows={summary.topPages.map((row) => [
                row.path,
                row.title || "-",
                row.views,
                row.activeUsers,
              ])}
            />

            <div className="grid gap-6 lg:grid-cols-2">
              <Table
                title="유입 채널"
                headers={["채널", "세션", "활성 사용자"]}
                rows={summary.topChannels.map((row) => [
                  row.channel || "(not set)",
                  row.sessions,
                  row.activeUsers,
                ])}
              />
              <Table
                title="상위 이벤트"
                headers={["이벤트", "횟수"]}
                rows={summary.topEvents.map((row) => [row.eventName, row.eventCount])}
              />
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
