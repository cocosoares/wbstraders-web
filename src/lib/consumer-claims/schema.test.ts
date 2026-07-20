import { describe, expect, it } from "vitest";
import { consumerClaimSchema } from "@/lib/consumer-claims/schema";

const validClaim = {
  customerName: "Ana Torres",
  documentType: "dni",
  documentNumber: "12345678",
  address: "Av. Ejemplo 123, Lima",
  phone: "+51 999 888 777",
  email: "ana@example.com",
  itemType: "product",
  itemDescription: "Pedido de vinos",
  orderNumber: "WBS-1001",
  amountCents: 15990,
  claimType: "reclamo",
  detail: "El pedido llegó fuera de la franja coordinada.",
  consumerRequest: "Solicito una respuesta por correo.",
  privacyAccepted: true,
} as const;

describe("consumerClaimSchema", () => {
  it("accepts a complete claim without adding fields", () => {
    expect(consumerClaimSchema.parse(validClaim)).toEqual(validClaim);
  });

  it("requires explicit privacy acceptance", () => {
    expect(
      consumerClaimSchema.safeParse({ ...validClaim, privacyAccepted: false }).success,
    ).toBe(false);
  });

  it("validates document formats and rejects unknown fields", () => {
    expect(
      consumerClaimSchema.safeParse({ ...validClaim, documentNumber: "123" }).success,
    ).toBe(false);
    expect(
      consumerClaimSchema.safeParse({ ...validClaim, internalStatus: "closed" }).success,
    ).toBe(false);
  });
});
