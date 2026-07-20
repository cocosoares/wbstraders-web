import { describe, expect, it } from "vitest";
import {
  isAnalyticsEventName,
  isSensitiveAnalyticsKey,
  sanitizeEventParams,
} from "./analytics";

describe("analytics", () => {
  it("acepta nombres de evento consistentes y rechaza valores inseguros", () => {
    expect(isAnalyticsEventName("occasion_cta_clicked")).toBe(true);
    expect(isAnalyticsEventName("Purchase Completed")).toBe(false);
    expect(isAnalyticsEventName("<script>")).toBe(false);
  });

  it("elimina claves que podrían contener datos personales", () => {
    expect(isSensitiveAnalyticsKey("email")).toBe(true);
    expect(isSensitiveAnalyticsKey("customer_phone")).toBe(true);
    expect(isSensitiveAnalyticsKey("occasion_slug")).toBe(false);
    expect(
      sanitizeEventParams({
        occasion_slug: "ceviche",
        placement: "hero",
        email: "cliente@example.com",
        contact_phone: "999999999",
        empty: undefined,
      }),
    ).toEqual({ occasion_slug: "ceviche", placement: "hero" });
  });

  it("limita textos y conserva métricas primitivas", () => {
    expect(
      sanitizeEventParams({
        label: "a".repeat(150),
        item_count: 3,
        qualified: true,
      }),
    ).toEqual({
      label: "a".repeat(100),
      item_count: 3,
      qualified: true,
    });
  });
});
