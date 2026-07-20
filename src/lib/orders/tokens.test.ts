import { describe, expect, it } from "vitest";
import { createPublicOrderToken, hashPublicOrderToken } from "@/lib/orders/tokens";

describe("public order tokens", () => {
  it("creates high-entropy bearer tokens and only persists deterministic hashes", () => {
    const first = createPublicOrderToken();
    const second = createPublicOrderToken();
    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThanOrEqual(43);
    expect(hashPublicOrderToken(first)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashPublicOrderToken(first)).toBe(hashPublicOrderToken(first));
  });
});
