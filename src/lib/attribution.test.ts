import { describe, expect, it } from "vitest";
import { captureAttributionTouch, mergeAttribution, sanitizeStoredAttribution } from "@/lib/attribution";

describe("order attribution", () => {
  it("captures UTMs and removes referrer query data", () => {
    expect(
      captureAttributionTouch(
        "https://wbstraders.pe/catalogo?utm_source=instagram&utm_medium=paid_social&utm_campaign=fiestas",
        "https://example.com/article?email=cliente@example.com",
        "https://wbstraders.pe",
      ),
    ).toEqual({
      source: "instagram",
      medium: "paid_social",
      campaign: "fiestas",
      referrer: "https://example.com/article",
    });
  });

  it("preserves the first touch and updates the last touch", () => {
    const first = { source: "google", medium: "cpc" };
    expect(mergeAttribution({ ...first, first, last: first }, { source: "instagram", medium: "social" })).toEqual({
      source: "instagram",
      medium: "social",
      first,
      last: { source: "instagram", medium: "social" },
    });
  });

  it("discards malformed legacy browser storage before checkout", () => {
    expect(sanitizeStoredAttribution({ source: 123, referrer: "javascript:alert(1)", legacy: true })).toBeUndefined();
    expect(
      sanitizeStoredAttribution({
        source: "instagram",
        unknown: "ignored",
        first: { medium: "paid_social" },
        last: "not-an-object",
      }, "https://wbstraders.pe"),
    ).toEqual({
      source: "instagram",
      first: { medium: "paid_social" },
    });
  });
});
