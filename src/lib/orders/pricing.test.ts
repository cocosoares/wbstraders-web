import { describe, expect, it } from "vitest";
import { calculateOrder, OrderPricingError } from "@/lib/orders/pricing";

describe("calculateOrder", () => {
  it("recalculates prices from the server catalog and applies free delivery", () => {
    const order = calculateOrder([{ productId: "casa-malbec", qty: 12 }], "Miraflores");
    expect(order.subtotalCents).toBe(39990);
    expect(order.deliveryCents).toBe(0);
    expect(order.totalCents).toBe(39990);
    expect(order.items[0]).toMatchObject({ quantity: 12, tierMinQty: 12, lineTotalCents: 39990 });
  });

  it("prices mix-and-match groups together and preserves exact cents", () => {
    const order = calculateOrder(
      [
        { productId: "livvera-bonarda", qty: 2 },
        { productId: "livvera-malvasia", qty: 2 },
        { productId: "livvera-sangiovese-rose", qty: 2 },
      ],
      "Miraflores",
    );
    expect(order.subtotalCents).toBe(39990);
    expect(order.items.reduce((sum, item) => sum + item.lineTotalCents, 0)).toBe(39990);
    expect(order.items.every((item) => item.tierMinQty === 6)).toBe(true);
  });

  it("rejects products and districts absent from trusted server data", () => {
    expect(() => calculateOrder([{ productId: "inventado", qty: 1 }], "Miraflores")).toThrow(OrderPricingError);
    expect(() => calculateOrder([{ productId: "casa-malbec", qty: 1 }], "Distrito inventado")).toThrow(
      "El distrito no está dentro de las zonas de reparto",
    );
  });
});
