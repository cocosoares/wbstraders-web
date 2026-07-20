import { describe, expect, it } from "vitest";
import { captureAttributionTouch, mergeAttribution } from "@/lib/attribution";

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
});
