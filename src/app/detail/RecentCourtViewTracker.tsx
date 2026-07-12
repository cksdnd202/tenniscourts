"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function RecentCourtViewTracker({ courtId }: { courtId: string }) {
  useEffect(() => {
    let isCancelled = false;

    async function trackRecentView() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const userId = session?.user.id;
      if (!userId || isCancelled) return;

      const viewedAt = new Date().toISOString();
      const recentViews = supabase.from("recent_viewed_courts" as never) as any;
      const { error } = await recentViews.upsert(
        {
          user_id: userId,
          court_id: courtId,
          viewed_at: viewedAt,
        },
        { onConflict: "user_id,court_id" }
      );

      if (error || isCancelled) return;

      const { data: oldRows } = await recentViews
        .select("id")
        .eq("user_id", userId)
        .order("viewed_at", { ascending: false })
        .range(20, 999);

      const oldIds =
        oldRows?.map((row: { id?: string | null }) => row.id).filter(Boolean) ?? [];
      if (oldIds.length > 0) {
        await recentViews.delete().in("id", oldIds);
      }
    }

    trackRecentView();

    return () => {
      isCancelled = true;
    };
  }, [courtId]);

  return null;
}
