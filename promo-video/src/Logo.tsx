import React from "react";
import { COLORS } from "./theme";

/** Icono de botella + copa + ramas, recreación del logo de WBStraders. */
export const LogoIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 96,
  color = COLORS.cream50,
}) => {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} fill="none">
      <path
        d="M12 46c-3-6-4-14-1-22"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="9" cy="24" r="1.7" fill={color} />
      <circle cx="12.5" cy="20" r="1.7" fill={color} />
      <circle cx="8" cy="30" r="1.7" fill={color} />
      <circle cx="13" cy="27" r="1.7" fill={color} />
      <path
        d="M28 8h6v3.5c0 3 1 4.5 2 6 1.2 1.8 2 3.4 2 6.5V50a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2V24c0-3.1.8-4.7 2-6.5 1-1.5 2-3 2-6V8Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <rect x="27.5" y="7" width="7" height="2.6" rx="0.8" fill={color} />
      <rect x="26.8" y="30" width="8.4" height="11" rx="0.8" fill={COLORS.gold500} />
      <path
        d="M44 22h12c0 7-2.4 11.5-6 12.5V44"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M46 47h8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M45.2 27c.7 4 2.4 6.4 4.8 6.9 2.4-.5 4.1-2.9 4.8-6.9h-9.6Z"
        fill={COLORS.gold500}
      />
      <path
        d="M58 44c4-7 4.5-16 1-24"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M59.5 26c2-.6 3.4-2 4-4.4-2.4 0-4 1.4-4 4.4Zm-.6 7c-2-.6-3.4-2-4-4.4 2.4 0 4 1.4 4 4.4Zm1 6c2-.6 3.4-2 4-4.4-2.4 0-4 1.4-4 4.4Z"
        fill={color}
      />
    </svg>
  );
};

export const Wordmark: React.FC<{ size?: number; dark?: boolean }> = ({
  size = 64,
  dark = false,
}) => (
  <div
    style={{
      fontSize: size,
      fontWeight: 700,
      letterSpacing: -1,
      lineHeight: 1,
    }}
  >
    <span style={{ color: COLORS.wine600 }}>WBS</span>
    <span style={{ color: dark ? COLORS.ink900 : COLORS.cream50 }}>traders</span>
  </div>
);
