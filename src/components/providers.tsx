"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";
import { AnalyticsScripts } from "@/components/analytics-scripts";
import { ConsentBanner } from "@/components/consent-banner";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      {children}
      <AnalyticsScripts />
      <ConsentBanner />
    </MotionConfig>
  );
}
