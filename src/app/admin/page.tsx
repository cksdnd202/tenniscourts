import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { AdminCourtManager } from "./AdminCourtManager";

function isLocalHost(host: string | null) {
  const normalized = host?.startsWith("[::1]") ? "::1" : host?.split(":")[0];
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

export default async function AdminPage() {
  const headerList = await headers();

  if (process.env.NODE_ENV === "production" || !isLocalHost(headerList.get("host"))) {
    notFound();
  }

  return <AdminCourtManager />;
}
