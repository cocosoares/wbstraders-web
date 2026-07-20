import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyMercadoPagoSignature } from "@/lib/payments/mercadopago";

describe("Mercado Pago webhook signature", () => {
  it("accepts the documented HMAC manifest", () => {
    const ts = "1704908010";
    const dataId = "ABC123";
    const requestId = "request-1";
    const secret = "test-secret";
    const digest = createHmac("sha256", secret)
      .update(`id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`)
      .digest("hex");
    expect(
      verifyMercadoPagoSignature({
        signatureHeader: `ts=${ts},v1=${digest}`,
        requestId,
        dataId,
        secret,
        nowSeconds: Number(ts),
      }),
    ).toBe(true);
  });

  it("rejects tampering and stale requests", () => {
    expect(
      verifyMercadoPagoSignature({
        signatureHeader: `ts=100,v1=${"0".repeat(64)}`,
        requestId: "request-1",
        dataId: "1",
        secret: "secret",
        nowSeconds: 10_000,
        toleranceSeconds: 900,
      }),
    ).toBe(false);
  });

  it("accepts a delayed authentic retry when no freshness window is imposed", () => {
    const ts = "100";
    const dataId = "payment-1";
    const requestId = "retry-request";
    const secret = "test-secret";
    const digest = createHmac("sha256", secret)
      .update(`id:${dataId};request-id:${requestId};ts:${ts};`)
      .digest("hex");
    expect(
      verifyMercadoPagoSignature({
        signatureHeader: `ts=${ts},v1=${digest}`,
        requestId,
        dataId,
        secret,
        nowSeconds: 10_000,
      }),
    ).toBe(true);
  });
});
