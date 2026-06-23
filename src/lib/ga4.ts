type Ga4MetricName =
  | "activeUsers"
  | "newUsers"
  | "sessions"
  | "screenPageViews"
  | "eventCount";

type Ga4DimensionName =
  | "date"
  | "eventName"
  | "pagePathPlusQueryString"
  | "pageTitle"
  | "sessionDefaultChannelGroup";

type Ga4RunReportResponse = {
  rows?: Array<{
    dimensionValues?: Array<{ value?: string }>;
    metricValues?: Array<{ value?: string }>;
  }>;
};

export type AnalyticsSummary = {
  totals: Record<Ga4MetricName, number>;
  dailyUsers: Array<{ date: string; activeUsers: number; screenPageViews: number }>;
  topPages: Array<{ path: string; title: string; views: number; activeUsers: number }>;
  topChannels: Array<{ channel: string; sessions: number; activeUsers: number }>;
  topEvents: Array<{ eventName: string; eventCount: number }>;
};

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} 환경변수가 설정되지 않았습니다.`);
  }

  return value;
}

async function getGoogleAccessToken() {
  const body = new URLSearchParams({
    client_id: getRequiredEnv("GOOGLE_CLIENT_ID"),
    client_secret: getRequiredEnv("GOOGLE_CLIENT_SECRET"),
    refresh_token: getRequiredEnv("GOOGLE_REFRESH_TOKEN"),
    grant_type: "refresh_token",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google access token 발급 실패: ${response.status} ${errorText}`);
  }

  const token = (await response.json()) as { access_token?: string };

  if (!token.access_token) {
    throw new Error("Google access token 응답에 access_token이 없습니다.");
  }

  return token.access_token;
}

async function runGa4Report({
  dimensions,
  metrics,
  startDate = "7daysAgo",
  endDate = "today",
  limit,
  orderMetric,
}: {
  dimensions?: Ga4DimensionName[];
  metrics: Ga4MetricName[];
  startDate?: string;
  endDate?: string;
  limit?: number;
  orderMetric?: Ga4MetricName;
}) {
  const propertyId = getRequiredEnv("GA4_PROPERTY_ID");
  const accessToken = await getGoogleAccessToken();

  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: dimensions?.map((name) => ({ name })),
        metrics: metrics.map((name) => ({ name })),
        limit,
        orderBys: orderMetric
          ? [
              {
                metric: { metricName: orderMetric },
                desc: true,
              },
            ]
          : undefined,
      }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GA4 리포트 조회 실패: ${response.status} ${errorText}`);
  }

  return (await response.json()) as Ga4RunReportResponse;
}

function metricValue(row: NonNullable<Ga4RunReportResponse["rows"]>[number], index: number) {
  return Number(row.metricValues?.[index]?.value ?? 0);
}

function dimensionValue(row: NonNullable<Ga4RunReportResponse["rows"]>[number], index: number) {
  return row.dimensionValues?.[index]?.value ?? "";
}

function formatGa4Date(value: string) {
  if (!/^\d{8}$/.test(value)) {
    return value;
  }

  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const [totalsReport, dailyReport, topPagesReport, channelsReport, eventsReport] =
    await Promise.all([
      runGa4Report({
        metrics: ["activeUsers", "newUsers", "sessions", "screenPageViews", "eventCount"],
      }),
      runGa4Report({
        dimensions: ["date"],
        metrics: ["activeUsers", "screenPageViews"],
      }),
      runGa4Report({
        dimensions: ["pagePathPlusQueryString", "pageTitle"],
        metrics: ["screenPageViews", "activeUsers"],
        orderMetric: "screenPageViews",
        limit: 10,
      }),
      runGa4Report({
        dimensions: ["sessionDefaultChannelGroup"],
        metrics: ["sessions", "activeUsers"],
        orderMetric: "sessions",
        limit: 10,
      }),
      runGa4Report({
        dimensions: ["eventName"],
        metrics: ["eventCount"],
        orderMetric: "eventCount",
        limit: 10,
      }),
    ]);

  const totalsRow = totalsReport.rows?.[0];

  return {
    totals: {
      activeUsers: totalsRow ? metricValue(totalsRow, 0) : 0,
      newUsers: totalsRow ? metricValue(totalsRow, 1) : 0,
      sessions: totalsRow ? metricValue(totalsRow, 2) : 0,
      screenPageViews: totalsRow ? metricValue(totalsRow, 3) : 0,
      eventCount: totalsRow ? metricValue(totalsRow, 4) : 0,
    },
    dailyUsers:
      dailyReport.rows?.map((row) => ({
        date: formatGa4Date(dimensionValue(row, 0)),
        activeUsers: metricValue(row, 0),
        screenPageViews: metricValue(row, 1),
      })) ?? [],
    topPages:
      topPagesReport.rows?.map((row) => ({
        path: dimensionValue(row, 0),
        title: dimensionValue(row, 1),
        views: metricValue(row, 0),
        activeUsers: metricValue(row, 1),
      })) ?? [],
    topChannels:
      channelsReport.rows?.map((row) => ({
        channel: dimensionValue(row, 0),
        sessions: metricValue(row, 0),
        activeUsers: metricValue(row, 1),
      })) ?? [],
    topEvents:
      eventsReport.rows?.map((row) => ({
        eventName: dimensionValue(row, 0),
        eventCount: metricValue(row, 0),
      })) ?? [],
  };
}
