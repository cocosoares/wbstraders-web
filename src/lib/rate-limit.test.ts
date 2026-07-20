import { beforeEach, describe, expect, it } from "vitest";
import { clearRateLimitsForTests, consumeRateLimit } from "./rate-limit";

describe("consumeRateLimit", () => {
  beforeEach(clearRateLimitsForTests);

  it("permite hasta el límite y bloquea la siguiente solicitud", () => {
    expect(consumeRateLimit("a", 2, 1_000, 100).allowed).toBe(true);
    expect(consumeRateLimit("a", 2, 1_000, 200).allowed).toBe(true);
    expect(consumeRateLimit("a", 2, 1_000, 300).allowed).toBe(false);
  });

  it("abre una ventana nueva después del vencimiento", () => {
    consumeRateLimit("a", 1, 1_000, 100);
    expect(consumeRateLimit("a", 1, 1_000, 1_101).allowed).toBe(true);
  });
});
