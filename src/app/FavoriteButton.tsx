"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { capturePostHogEvent } from "@/lib/posthogClient";
import { supabase } from "@/lib/supabase";

const FAVORITE_COLOR = "#6FCF97";
const EMPTY_COLOR = "#D8D8D8";

export function FavoriteButton({
  courtId,
  variant = "dark",
  source = "unknown",
}: {
  courtId: string;
  variant?: "dark" | "light";
  source?: string;
}) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadFavoriteState() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        if (isMounted) {
          setIsFavorite(false);
        }
        return;
      }

      const favoriteCourts = supabase.from("favorite_courts" as never) as any;
      const { data, error } = await favoriteCourts
        .select("court_id")
        .eq("user_id", session.user.id)
        .eq("court_id", courtId)
        .maybeSingle();

      if (isMounted && !error) {
        setIsFavorite(Boolean(data));
      }
    }

    loadFavoriteState();

    return () => {
      isMounted = false;
    };
  }, [courtId]);

  const handleClick = async () => {
    if (isPending) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setIsFavorite(false);
      setIsLoginPromptOpen(true);
      return;
    }

    setIsPending(true);

    const favoriteCourts = supabase.from("favorite_courts" as never) as any;
    const nextIsFavorite = !isFavorite;
    const { error } = nextIsFavorite
      ? await favoriteCourts.upsert(
          {
            user_id: session.user.id,
            court_id: courtId,
          },
          { onConflict: "user_id,court_id" }
        )
      : await favoriteCourts.delete().eq("user_id", session.user.id).eq("court_id", courtId);

    setIsPending(false);

    if (error) {
      alert("찜 정보를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    setIsFavorite(nextIsFavorite);
    capturePostHogEvent("favorite_clicked", {
      courtId,
      source,
      action: nextIsFavorite ? "add" : "remove",
    });
  };

  const handleLogin = async () => {
    const redirectTo = window.location.href;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo,
      },
    });

    if (error) {
      alert(`카카오 로그인 연결에 실패했습니다: ${error.message}`);
    }
  };

  const isLightVariant = variant === "light";
  const buttonClassName = isLightVariant
    ? `inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2C8B56] disabled:cursor-not-allowed disabled:opacity-60 ${
        isFavorite ? "bg-[#2C8B56] text-white" : "bg-[#f3f4f6] text-[#4b5563] hover:bg-[#e5e7eb]"
      }`
    : "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#2C2C2C] transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6FCF97] disabled:cursor-not-allowed disabled:opacity-60";
  const iconFill = isFavorite ? (isLightVariant ? "currentColor" : FAVORITE_COLOR) : "none";
  const iconStroke = isFavorite
    ? isLightVariant
      ? "currentColor"
      : FAVORITE_COLOR
    : isLightVariant
      ? "currentColor"
      : EMPTY_COLOR;

  return (
    <>
      <button
        type="button"
        aria-label={isFavorite ? "찜 해제" : "찜하기"}
        aria-pressed={isFavorite}
        disabled={isPending}
        onClick={handleClick}
        className={buttonClassName}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill={iconFill}
          stroke={iconStroke}
          strokeWidth={isFavorite ? "2.6" : "1.5"}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5.8 4.9C5.8 3.85 6.65 3 7.7 3h8.6c1.05 0 1.9.85 1.9 1.9V20.4L12 15.5l-6.2 4.9V4.9Z" />
        </svg>
      </button>

      {isMounted && isLoginPromptOpen
        ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4">
          <div className="w-full max-w-sm rounded-xl border border-[#2C2C2C] bg-[#191B1E] p-5 shadow-2xl">
            <h2 className="text-lg font-semibold text-white">로그인이 필요한 기능입니다.</h2>
            <p className="mt-3 text-sm leading-6 text-[#B0B0B0]">로그인하시겠어요?</p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsLoginPromptOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-[#B0B0B0] hover:bg-[#2C2C2C]"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleLogin}
                className="rounded-lg bg-[#2C8B56] px-4 py-2 text-sm font-medium text-white hover:bg-[#53A978]"
              >
                로그인하기
              </button>
            </div>
          </div>
        </div>,
            document.body
          )
        : null}
    </>
  );
}
