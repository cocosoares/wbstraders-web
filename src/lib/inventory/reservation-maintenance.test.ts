import { describe, expect, it } from "vitest";
import { normalizeReservationExpiryLimit } from "@/lib/inventory/reservation-maintenance";

describe("normalizeReservationExpiryLimit", () => {
  it("uses the operational default when the value is absent or malformed", () => {
    expect(normalizeReservationExpiryLimit(null)).toBe(500);
    expect(normalizeReservationExpiryLimit("invalid")).toBe(500);
    expect(normalizeReservationExpiryLimit("1.5")).toBe(500);
  });

  it("keeps the database limit inside its accepted bounds", () => {
    expect(normalizeReservationExpiryLimit("0")).toBe(1);
    expect(normalizeReservationExpiryLimit("250")).toBe(250);
    expect(normalizeReservationExpiryLimit("5000")).toBe(1000);
  });
});
