import { describe, expect, it } from "vitest";
import { createOrderSchema } from "@/lib/orders/schema";

const base = {
  customer: { name: "Cliente Prueba", phone: "+51 999 888 777", email: "TEST@EXAMPLE.COM" },
  delivery: { district: "Miraflores", address: "Av. Prueba 123" },
  paymentMethod: "mercadopago",
  marketingConsent: false,
  ageConfirmed: true,
  termsAccepted: true,
  items: [{ productId: "casa-malbec", qty: 2 }],
};

describe("createOrderSchema", () => {
  it("defaults to boleta and normalizes email", () => {
    const parsed = createOrderSchema.parse(base);
    expect(parsed.fiscal.receiptType).toBe("boleta");
    expect(parsed.customer.email).toBe("test@example.com");
  });

  it("requires an email for transactional order updates", () => {
    expect(
      createOrderSchema.safeParse({
        ...base,
        customer: { name: "Cliente Prueba", phone: "+51 999 888 777" },
      }).success,
    ).toBe(false);
  });

  it("requires complete fiscal identity for factura", () => {
    expect(
      createOrderSchema.safeParse({ ...base, fiscal: { receiptType: "factura", documentType: "ruc", documentNumber: "123" } })
        .success,
    ).toBe(false);
    expect(
      createOrderSchema.safeParse({
        ...base,
        fiscal: {
          receiptType: "factura",
          documentType: "ruc",
          documentNumber: "20123456789",
          businessName: "Empresa Prueba SAC",
          fiscalAddress: "Av. Fiscal 456, Lima",
        },
      }).success,
    ).toBe(true);
  });

  it("requires explicit adult confirmation", () => {
    expect(createOrderSchema.safeParse({ ...base, ageConfirmed: false }).success).toBe(false);
  });

  it("requires explicit acceptance of terms", () => {
    const { termsAccepted: _termsAccepted, ...withoutTerms } = base;
    expect(createOrderSchema.safeParse(withoutTerms).success).toBe(false);
    expect(createOrderSchema.safeParse({ ...base, termsAccepted: false }).success).toBe(false);
  });

  it("accepts only HTTP(S) referrers and removes query data", () => {
    const parsed = createOrderSchema.parse({
      ...base,
      attribution: { source: "referral", referrer: "https://example.com/vinos?email=cliente@example.com#detalle" },
    });
    expect(parsed.attribution?.referrer).toBe("https://example.com/vinos");
    expect(
      createOrderSchema.safeParse({ ...base, attribution: { referrer: "javascript:alert(1)" } }).success,
    ).toBe(false);
  });
});
