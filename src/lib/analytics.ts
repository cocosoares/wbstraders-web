export type AnalyticsValue = string | number | boolean;
export type AnalyticsParams = Record<string, AnalyticsValue | null | undefined>;

const CONSENT_KEY = "wbs-consent-v1";
const EVENT_NAME = /^[a-z][a-z0-9_]{1,39}$/;
const SENSITIVE_KEY =
  /(^|_)(name|nombre|email|correo|phone|telefono|dni|document|documento|address|direccion|district|distrito|message|mensaje|notes?|comentarios?)(_|$)/i;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function isAnalyticsEventName(value: string): boolean {
  return EVENT_NAME.test(value);
}

export function isSensitiveAnalyticsKey(key: string): boolean {
  return SENSITIVE_KEY.test(key);
}

export function sanitizeEventParams(params: AnalyticsParams): Record<string, AnalyticsValue> {
  const safeParams: Record<string, AnalyticsValue> = {};
  for (const [key, value] of Object.entries(params)) {
    if (
      !EVENT_NAME.test(key) ||
      isSensitiveAnalyticsKey(key) ||
      value === null ||
      value === undefined
    ) {
      continue;
    }

    safeParams[key] = typeof value === "string" ? value.slice(0, 100) : value;
  }
  return safeParams;
}

function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const consent = JSON.parse(
      window.localStorage.getItem(CONSENT_KEY) ?? "null",
    ) as { analytics?: unknown } | null;
    return consent?.analytics === true;
  } catch {
    return false;
  }
}

/**
 * Envía un evento solo después del consentimiento y descarta propiedades que
 * podrían contener datos personales. Los call sites deben usar únicamente
 * dimensiones de comportamiento o catálogo, nunca valores escritos por el usuario.
 */
export function trackEvent(
  eventName: string,
  params: AnalyticsParams = {},
): boolean {
  if (!isAnalyticsEventName(eventName) || !hasAnalyticsConsent()) return false;

  const safeParams = sanitizeEventParams(params);
  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, safeParams);
  } else {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({ event: eventName, ...safeParams });
  }
  return true;
}
