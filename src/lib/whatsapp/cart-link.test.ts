import { describe, expect, it } from "vitest";
import {
  createWhatsAppCheckoutSessionUrl,
  createWhatsAppCheckoutUrl,
  decodeWhatsAppCart,
  encodeWhatsAppCart,
} from "./cart-link";

describe("WhatsApp checkout links", () => {
  it("serializes only known products and safe quantities", () => {
    expect(
      encodeWhatsAppCart([
        { productId: "casa-malbec", quantity: 2 },
        { productId: "unknown", quantity: 4 },
        { productId: "casa-malbec", quantity: 1 },
      ]),
    ).toBe("casa-malbec:3");
  });

  it("ignores malformed or unknown cart values", () => {
    expect(decodeWhatsAppCart("unknown:7,casa-malbec:no,casa-malbec:2")).toEqual({
      "casa-malbec": 2,
    });
  });

  it("creates an attributable checkout URL without price data", () => {
    expect(
      createWhatsAppCheckoutUrl({
        baseUrl: "https://wbstraders.pe",
        items: [{ productId: "1700-torrontes", quantity: 1 }],
      }),
    ).toBe(
      "https://wbstraders.pe/checkout?wbs_cart=1700-torrontes%3A1&utm_source=whatsapp&utm_medium=conversation&utm_campaign=sommelier&utm_content=recommendation",
    );
  });

  it("creates a compact opaque URL for WhatsApp checkout buttons", () => {
    const token = "a".repeat(64);
    expect(
      createWhatsAppCheckoutSessionUrl({ baseUrl: "https://wbstraders.pe", token }),
    ).toBe(`https://wbstraders.pe/w/${token}`);
  });
});
