import { describe, expect, it } from "vitest";
import {
  isWhatsAppJourneyFresh,
  mergeWhatsAppQualification,
  parseWhatsAppJourney,
} from "./journey";

describe("WhatsApp journey", () => {
  it("keeps previous qualification values when a new answer only fills one field", () => {
    expect(
      mergeWhatsAppQualification(
        { occasion: "parrilla y carnes", purchaseFormat: "single" },
        { budget: "100_250" },
      ),
    ).toEqual({ occasion: "parrilla y carnes", purchaseFormat: "single", budget: "100_250" });
  });

  it("accepts only whitelisted persisted state", () => {
    expect(
      parseWhatsAppJourney({
        path: "horeca",
        stage: "horeca_volume",
        qualification: { customerType: "horeca", horecaBusinessType: "restaurant" },
      }),
    ).toMatchObject({ path: "horeca", stage: "horeca_volume" });
    expect(parseWhatsAppJourney({ path: "unknown", stage: "anything" })).toBeUndefined();
  });

  it("expires a journey after thirty minutes", () => {
    expect(
      isWhatsAppJourneyFresh({
        path: "wine",
        stage: "wine_format",
        updatedAt: new Date(Date.now() - 31 * 60 * 1_000).toISOString(),
      }),
    ).toBe(false);
  });
});
