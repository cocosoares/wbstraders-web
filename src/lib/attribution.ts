export type AttributionTouch = {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  referrer?: string;
};

export type OrderAttribution = AttributionTouch & {
  first?: AttributionTouch;
  last?: AttributionTouch;
};

const STORAGE_KEY = "wbs-attribution-v1";
const CAMPAIGN_KEYS = ["source", "medium", "campaign", "content", "term"] as const;

function limited(value: string | null): string | undefined {
  const normalized = value?.trim().slice(0, 160);
  return normalized || undefined;
}

function safeReferrer(value: string | undefined, siteOrigin?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    if (siteOrigin && url.origin === siteOrigin) return undefined;
    return `${url.origin}${url.pathname}`.slice(0, 2048);
  } catch {
    return undefined;
  }
}

function sanitizeTouch(value: unknown, siteOrigin?: string): AttributionTouch | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;

  const candidate = value as Record<string, unknown>;
  const touch: AttributionTouch = {};
  for (const key of CAMPAIGN_KEYS) {
    const normalized = typeof candidate[key] === "string" ? limited(candidate[key]) : undefined;
    if (normalized) touch[key] = normalized;
  }

  const referrer = typeof candidate.referrer === "string"
    ? safeReferrer(candidate.referrer, siteOrigin)
    : undefined;
  if (referrer) touch.referrer = referrer;

  return Object.keys(touch).length ? touch : undefined;
}

export function sanitizeStoredAttribution(
  value: unknown,
  siteOrigin?: string,
): OrderAttribution | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;

  const candidate = value as Record<string, unknown>;
  const current = sanitizeTouch(candidate, siteOrigin);
  const first = sanitizeTouch(candidate.first, siteOrigin);
  const last = sanitizeTouch(candidate.last, siteOrigin);
  if (!current && !first && !last) return undefined;

  return {
    ...current,
    ...(first ? { first } : {}),
    ...(last ? { last } : {}),
  };
}

export function captureAttributionTouch(
  pageUrl: string,
  referrer?: string,
  siteOrigin?: string,
): AttributionTouch | undefined {
  try {
    const url = new URL(pageUrl);
    const touch: AttributionTouch = {};
    for (const key of CAMPAIGN_KEYS) {
      const value = limited(url.searchParams.get(`utm_${key}`));
      if (value) touch[key] = value;
    }
    const safe = safeReferrer(referrer, siteOrigin ?? url.origin);
    if (safe) touch.referrer = safe;
    return Object.keys(touch).length ? touch : undefined;
  } catch {
    return undefined;
  }
}

export function mergeAttribution(
  current: OrderAttribution | undefined,
  touch: AttributionTouch | undefined,
): OrderAttribution | undefined {
  if (!touch) return current;
  return {
    ...touch,
    first: current?.first ?? touch,
    last: touch,
  };
}

export function captureBrowserAttribution(): OrderAttribution | undefined {
  if (typeof window === "undefined") return undefined;
  let existing: OrderAttribution | undefined;
  try {
    existing = sanitizeStoredAttribution(
      JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null"),
      window.location.origin,
    );
  } catch {
    existing = undefined;
  }
  const next = mergeAttribution(
    existing,
    captureAttributionTouch(window.location.href, document.referrer, window.location.origin),
  );
  if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
