import { describe, expect, it } from "vitest";
import { hasValidTestCheckoutCoupon, isTestCheckoutEnabled } from "@/lib/orders/test-checkout";

describe("test checkout coupon", () => {
  it("requires an explicit server-side switch and a configured coupon", () => {
    expect(isTestCheckoutEnabled("false", "123", "greciasemorile@gmail.com")).toBe(false);
    expect(isTestCheckoutEnabled("true", "", "greciasemorile@gmail.com")).toBe(false);
    expect(isTestCheckoutEnabled("true", "123", "")).toBe(false);
    expect(isTestCheckoutEnabled("true", "123", "greciasemorile@gmail.com")).toBe(true);
  });

  it("accepts only the configured coupon from an authorized email", () => {
    expect(
      hasValidTestCheckoutCoupon(
        "123",
        "greciasemorile@gmail.com",
        "true",
        "123",
        "greciasemorile@gmail.com",
      ),
    ).toBe(true);
    expect(
      hasValidTestCheckoutCoupon(
        " 123 ",
        "Greciasemorile@gmail.com",
        "true",
        "123",
        "greciasemorile@gmail.com",
      ),
    ).toBe(true);
    expect(
      hasValidTestCheckoutCoupon(
        "123",
        "otra-persona@example.com",
        "true",
        "123",
        "greciasemorile@gmail.com",
      ),
    ).toBe(false);
    expect(
      hasValidTestCheckoutCoupon(
        "124",
        "greciasemorile@gmail.com",
        "true",
        "123",
        "greciasemorile@gmail.com",
      ),
    ).toBe(false);
  });
});
