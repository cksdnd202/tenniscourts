import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isLocalHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "::1" ||
    h === "[::1]" ||
    h === "::ffff:127.0.0.1"
  );
}

export function proxy(request: NextRequest) {
  if (!isLocalHostname(request.nextUrl.hostname)) {
    return new NextResponse(null, { status: 404 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/test-lab", "/test-lab/:path*", "/api/import/seoul-tennis-one"],
};
