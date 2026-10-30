import { NextRequest, NextResponse } from "next/server";
import { denyUnlessAdmin } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;
  const db = getSupabaseAdmin();
  const [allCourts, visibleCourts, publishedNotices, unanswered, recentInquiries, recentNotices] = await Promise.all([
    db.from("courtinfo").select("id", { count: "exact", head: true }),
    db.from("courtinfo").select("id", { count: "exact", head: true }).eq("use_or_not", true),
    db.from("notices").select("id", { count: "exact", head: true }).eq("status", "published"),
    db.from("customer_inquiries").select("id", { count: "exact", head: true }).in("status", ["new", "in_progress"]),
    db.from("customer_inquiries").select("id,title,source,status,contact_email,created_at").order("created_at", { ascending: false }).limit(5),
    db.from("notices").select("id,title,channels,status,updated_at").order("updated_at", { ascending: false }).limit(5),
  ]);
  const error = [allCourts, visibleCourts, publishedNotices, unanswered, recentInquiries, recentNotices].find((result) => result.error)?.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    counts: {
      courts: allCourts.count ?? 0,
      visibleCourts: visibleCourts.count ?? 0,
      publishedNotices: publishedNotices.count ?? 0,
      unansweredInquiries: unanswered.count ?? 0,
    },
    recentInquiries: recentInquiries.data ?? [],
    recentNotices: recentNotices.data ?? [],
  }, { headers: { "Cache-Control": "no-store" } });
}
