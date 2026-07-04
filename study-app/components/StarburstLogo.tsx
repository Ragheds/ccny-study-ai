"use client";

import { useId } from "react";

export function StarburstLogo({
  size = 28,
  white = false,
}: {
  size?: number;
  white?: boolean;
}) {
  const id = useId();
  const fill = white ? "#fff" : `url(#${id})`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      {!white && (
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF6B35" />
            <stop offset="1" stopColor="#F7931E" />
          </linearGradient>
        </defs>
      )}
      <rect x="14" y="1" width="4" height="30" rx="2" fill={fill} />
      <rect x="14" y="1" width="4" height="30" rx="2" fill={fill} transform="rotate(60 16 16)" />
      <rect x="14" y="1" width="4" height="30" rx="2" fill={fill} transform="rotate(120 16 16)" />
    </svg>
  );
}