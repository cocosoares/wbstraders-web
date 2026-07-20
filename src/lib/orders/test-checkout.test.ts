import { describe, expect, it } from "vitest";
import { hasValidTestCheckoutCoupon, isTestCheckoutEnabled } from "@/lib/orders/test-checkout";

describe("test checkout coupon", () => {
  it("requires an explicit server-side switch and a configured coupon", () => {
    expect(isTestCheckoutEnabled("false", "123")).toBe(false);
    expect(isTestCheckoutEnabled("true", "")).toBe(false);
    expect(isTestCheckoutEnabled("true", "123")).toBe(true);
  });

  it("accepts only the configured coupon", () => {
    expect(hasValidTestCheckoutCoupon("123", "true", "123")).toBe(true);
    expect(hasValidTestCheckoutCoupon(" 123 ", "true", "123")).toBe(true);
    expect(hasValidTestCheckoutCoupon("124", "true", "123")).toBe(false);
    expect(hasValidTestCheckoutCoupon("123", "false", "123")).toBe(false);
  });
});
