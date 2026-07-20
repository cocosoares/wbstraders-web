import { timingSafeEqual } from "node:crypto";

function constantTimeMatch(value: string, expected: string): boolean {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return (
    valueBuffer.length === expectedBuffer.length &&
    timingSafeEqual(valueBuffer, expectedBuffer)
  );
}

export function isTestCheckoutEnabled(
  enabled = process.env.ALLOW_TEST_CHECKOUT,
  coupon = process.env.TEST_CHECKOUT_COUPON,
): boolean {
  return enabled === "true" && Boolean(coupon?.trim());
}

export function hasValidTestCheckoutCoupon(
  submittedCoupon: string | undefined,
  enabled = process.env.ALLOW_TEST_CHECKOUT,
  expectedCoupon = process.env.TEST_CHECKOUT_COUPON,
): boolean {
  if (!isTestCheckoutEnabled(enabled, expectedCoupon)) return false;
  const value = submittedCoupon?.trim();
  const expected = expectedCoupon?.trim();
  return Boolean(value && expected && constantTimeMatch(value, expected));
}
