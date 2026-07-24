export type WhatsAppPurchaseFormat = "single" | "pack" | "case";
export type WhatsAppBudget = "under_100" | "100_250" | "over_250";
export type WhatsAppJourneyPath = "wine" | "promotions" | "catalog" | "horeca" | "support";
export type WhatsAppJourneyStage =
  | "menu"
  | "wine_occasion"
  | "wine_format"
  | "gift_choice"
  | "gift_budget"
  | "promotion_style"
  | "promotion_format"
  | "catalog_browse"
  | "recommendation_ready"
  | "recommendation_adjust"
  | "checkout_ready"
  | "horeca_business"
  | "horeca_volume"
  | "horeca_handoff"
  | "order_support"
  | "shipping"
  | "human_handoff"
  | "marketing_opt_in";

export type WhatsAppQualificationData = {
  occasion?: string;
  wineStyle?: string;
  purchaseFormat?: WhatsAppPurchaseFormat;
  budget?: WhatsAppBudget;
  customerType?: "consumer" | "horeca";
  horecaBusinessType?: "restaurant" | "hotel" | "bar" | "company" | "other";
  horecaVolume?: "6_12" | "13_48" | "49_plus";
  recommendedProductSlug?: string;
};

export type WhatsAppJourneyState = {
  path: WhatsAppJourneyPath;
  stage: WhatsAppJourneyStage;
  qualification?: WhatsAppQualificationData;
  updatedAt?: string;
};

const paths = new Set<WhatsAppJourneyPath>(["wine", "promotions", "catalog", "horeca", "support"]);
const stages = new Set<WhatsAppJourneyStage>([
  "menu",
  "wine_occasion",
  "wine_format",
  "gift_choice",
  "gift_budget",
  "promotion_style",
  "promotion_format",
  "catalog_browse",
  "recommendation_ready",
  "recommendation_adjust",
  "checkout_ready",
  "horeca_business",
  "horeca_volume",
  "horeca_handoff",
  "order_support",
  "shipping",
  "human_handoff",
  "marketing_opt_in",
]);

function shortText(value: unknown, maxLength: number): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : undefined;
}

function parseQualification(value: unknown): WhatsAppQualificationData | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const source = value as Record<string, unknown>;
  const customerType = source.customerType === "horeca" || source.customerType === "consumer"
    ? source.customerType
    : undefined;
  const purchaseFormat = ["single", "pack", "case"].includes(String(source.purchaseFormat))
    ? (source.purchaseFormat as WhatsAppPurchaseFormat)
    : undefined;
  const budget = ["under_100", "100_250", "over_250"].includes(String(source.budget))
    ? (source.budget as WhatsAppBudget)
    : undefined;
  const horecaBusinessType = ["restaurant", "hotel", "bar", "company", "other"].includes(
    String(source.horecaBusinessType),
  )
    ? (source.horecaBusinessType as WhatsAppQualificationData["horecaBusinessType"])
    : undefined;
  const horecaVolume = ["6_12", "13_48", "49_plus"].includes(String(source.horecaVolume))
    ? (source.horecaVolume as WhatsAppQualificationData["horecaVolume"])
    : undefined;

  const qualification: WhatsAppQualificationData = {
    ...(shortText(source.occasion, 160) ? { occasion: shortText(source.occasion, 160) } : {}),
    ...(shortText(source.wineStyle, 80) ? { wineStyle: shortText(source.wineStyle, 80) } : {}),
    ...(purchaseFormat ? { purchaseFormat } : {}),
    ...(budget ? { budget } : {}),
    ...(customerType ? { customerType } : {}),
    ...(horecaBusinessType ? { horecaBusinessType } : {}),
    ...(horecaVolume ? { horecaVolume } : {}),
    ...(shortText(source.recommendedProductSlug, 120)
      ? { recommendedProductSlug: shortText(source.recommendedProductSlug, 120) }
      : {}),
  };
  return Object.keys(qualification).length ? qualification : undefined;
}

/** Parses only the small, whitelisted state that the bot needs to resume a chat. */
export function parseWhatsAppJourney(value: unknown): WhatsAppJourneyState | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const source = value as Record<string, unknown>;
  const path = source.path;
  const stage = source.stage;
  if (typeof path !== "string" || typeof stage !== "string" || !paths.has(path as WhatsAppJourneyPath) || !stages.has(stage as WhatsAppJourneyStage)) {
    return undefined;
  }
  const updatedAt = shortText(source.updatedAt, 64);
  return {
    path: path as WhatsAppJourneyPath,
    stage: stage as WhatsAppJourneyStage,
    ...(parseQualification(source.qualification) ? { qualification: parseQualification(source.qualification) } : {}),
    ...(updatedAt ? { updatedAt } : {}),
  };
}

/** Conversation choices expire after 30 minutes so a new visit never inherits a stale recommendation. */
export function isWhatsAppJourneyFresh(
  journey: WhatsAppJourneyState | undefined,
  now = Date.now(),
): boolean {
  if (!journey?.updatedAt) return Boolean(journey);
  const updatedAt = Date.parse(journey.updatedAt);
  return Number.isFinite(updatedAt) && updatedAt >= now - 30 * 60 * 1_000 && updatedAt <= now + 5 * 60 * 1_000;
}

export function mergeWhatsAppQualification(
  previous: WhatsAppQualificationData | undefined,
  next: WhatsAppQualificationData | undefined,
): WhatsAppQualificationData | undefined {
  const merged: WhatsAppQualificationData = { ...(previous ?? {}) };
  for (const [key, value] of Object.entries(next ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      (merged as Record<string, unknown>)[key] = value;
    }
  }
  return Object.keys(merged).length ? merged : undefined;
}
