"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { SportType } from "./types";
import { SPORT_LABELS } from "@/lib/sports";

const STORAGE_KEY = "courtskorea:selected-sport";

export function SportSwitcher({
  sportType,
  className = "",
}: {
  sportType: SportType;
  className?: string;
}) {
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, sportType);
  }, [sportType]);

  return (
    <div
      className={`inline-flex rounded-full border border-[#2A2D33] bg-[#14161A] p-1 ${className}`}
      aria-label="종목 선택"
    >
      {(["tennis", "badminton"] as const).map((value) => {
        const selected = value === sportType;
        return (
          <Link
            key={value}
            href={`/${value}`}
            onClick={() => window.localStorage.setItem(STORAGE_KEY, value)}
            aria-current={selected ? "page" : undefined}
            className={`inline-flex items-center justify-center min-w-[92px] rounded-full px-4 py-2 text-sm font-bold transition-colors ${
              selected
                ? value === "badminton"
                  ? "bg-[#375AE6] text-white"
                  : "bg-[#2F9461] text-white"
                : "text-[#8A8F98] hover:text-white"
            }`}
          >
            {SPORT_LABELS[value]}
          </Link>
        );
      })}
    </div>
  );
}
