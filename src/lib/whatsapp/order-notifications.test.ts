import { describe, expect, it } from "vitest";
import { buildWhatsAppOrderNotification } from "./order-notifications";

const base = {
  orderNumber: "WBS-2026-000123",
  customerName: "Ana Torres",
  totalCents: 18528,
};

describe("WhatsApp order lifecycle notifications", () => {
  it("communicates that the website order was received without claiming payment", () => {
    const message = buildWhatsAppOrderNotification({
      ...base,
      kind: "order.received",
    });
    expect(message).toContain("Recibimos tu pedido");
    expect(message).toContain("WBS-2026-000123");
    expect(message).toContain("S/");
    expect(message).not.toContain("pago confirmado");
  });

  it.each([
    ["payment.confirmed", "Confirmamos el pago"],
    ["fulfillment.preparing", "en preparación"],
    ["fulfillment.shipped", "salió a reparto"],
    ["fulfillment.delivered", "como entregado"],
    ["order.cancelled", "fue cancelado"],
  ] as const)("builds the %s customer update", (kind, expected) => {
    expect(buildWhatsAppOrderNotification({ ...base, kind })).toContain(expected);
  });
});
