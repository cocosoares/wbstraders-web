"use client";

import Link from "next/link";
import type { ComponentProps, MouseEventHandler } from "react";
import {
  trackEvent,
  type AnalyticsParams,
} from "@/lib/analytics";

type TrackedLinkProps = ComponentProps<typeof Link> & {
  eventName: string;
  eventParams?: AnalyticsParams;
};

export function TrackedLink({
  eventName,
  eventParams,
  onClick,
  ...props
}: TrackedLinkProps) {
  const handleClick: MouseEventHandler<HTMLAnchorElement> = (event) => {
    trackEvent(eventName, eventParams);
    onClick?.(event);
  };

  return <Link {...props} onClick={handleClick} />;
}

type TrackedAnchorProps = ComponentProps<"a"> & {
  eventName: string;
  eventParams?: AnalyticsParams;
};

export function TrackedAnchor({
  eventName,
  eventParams,
  onClick,
  ...props
}: TrackedAnchorProps) {
  const handleClick: MouseEventHandler<HTMLAnchorElement> = (event) => {
    trackEvent(eventName, eventParams);
    onClick?.(event);
  };

  return <a {...props} onClick={handleClick} />;
}
