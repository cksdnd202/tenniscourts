"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  children: React.ReactNode;
};

export function MobileScrollHideBar({ children }: Props) {
  const [isHidden, setIsHidden] = useState(false);
  const lastScrollYRef = useRef(0);
  const tickingRef = useRef(false);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;

    const handleScroll = () => {
      if (tickingRef.current) return;

      tickingRef.current = true;
      window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const diff = currentScrollY - lastScrollYRef.current;

        if (currentScrollY < 20) {
          setIsHidden(false);
        } else if (diff > 8) {
          setIsHidden(true);
        } else if (diff < -8) {
          setIsHidden(false);
        }

        lastScrollYRef.current = currentScrollY;
        tickingRef.current = false;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div
      className={`min-[1032px]:hidden fixed bottom-0 left-0 right-0 z-20 transition-transform duration-300 ease-out ${
        isHidden ? "translate-y-full" : "translate-y-0"
      }`}
    >
      {children}
    </div>
  );
}
