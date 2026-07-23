import { timingSafeEqual } from "node:crypto";

function constantTimeMatch(value: string, expected: string): boolean {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return (
    valueBuffer.length === expectedBuffer.length &&
    timingSafeEqual(valueBuffer, expectedBuffer)
  );
}

function allowedEmails(value = process.env.TEST_CHECKOUT_ALLOWED_EMAILS): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isTestCheckoutEnabled(
  enabled = process.env.ALLOW_TEST_CHECKOUT,
  coupon = process.env.TEST_CHECKOUT_COUPON,
  emails = process.env.TEST_CHECKOUT_ALLOWED_EMAILS,
): boolean {
  return enabled === "true" && Boolean(coupon?.trim()) && allowedEmails(emails).size > 0;
}

export function hasValidTestCheckoutCoupon(
  submittedCoupon: string | undefined,
  customerEmail: string | undefined,
  enabled = process.env.ALLOW_TEST_CHECKOUT,
  expectedCoupon = process.env.TEST_CHECKOUT_COUPON,
  emails = process.env.TEST_CHECKOUT_ALLOWED_EMAILS,
): boolean {
  if (!isTestCheckoutEnabled(enabled, expectedCoupon, emails)) return false;
  const value = submittedCoupon?.trim();
  const expected = expectedCoupon?.trim();
  const email = customerEmail?.trim().toLowerCase();
  return Boolean(
    value &&
      expected &&
      email &&
      allowedEmails(emails).has(email) &&
      constantTimeMatch(value, expected),
  );
}
