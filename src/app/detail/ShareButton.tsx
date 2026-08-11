"use client";

import { useEffect, useState } from "react";

type ShareButtonProps = {
  title: string;
};

export function ShareButton({ title }: ShareButtonProps) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;

    const timer = window.setTimeout(() => {
      setMessage(null);
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [message]);

  const handleShare = async () => {
    const url = window.location.href;
    const shareTitle = title.trim() || "Courts Korea";

    try {
      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          url,
        });
        return;
      }

      await navigator.clipboard.writeText(url);
      setMessage("링크를 복사했어요.");
    } catch (error) {
      if ((error as Error).name === "AbortError") return;

      try {
        await navigator.clipboard.writeText(url);
        setMessage("링크를 복사했어요.");
      } catch {
        setMessage("공유하지 못했어요.");
      }
    }
  };

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        aria-label="공유하기"
        onClick={handleShare}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#2C2C2C] text-[#D8D8D8] transition-transform hover:scale-105 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6FCF97]"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8.8 12.7 15.2 16.4" />
          <path d="M15.2 7.6 8.8 11.3" />
          <circle cx="6.8" cy="12" r="2.2" />
          <circle cx="17.2" cy="6.5" r="2.2" />
          <circle cx="17.2" cy="17.5" r="2.2" />
        </svg>
      </button>
      {message ? (
        <div className="absolute right-0 top-10 z-20 whitespace-nowrap rounded-md bg-[#2C2C2C] px-3 py-2 text-xs font-medium text-white shadow-xl">
          {message}
        </div>
      ) : null}
    </div>
  );
}
