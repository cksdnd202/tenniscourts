"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className: string;
};

export function HorizontalScrollArea({ children, className }: Props) {
  return (
    <div className="relative min-w-0">
      <div className={className}>{children}</div>
    </div>
  );
}
