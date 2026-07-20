import { describe, expect, it } from "vitest";
import { respondToWhatsApp } from "./conversation";

describe("WhatsApp sommelier conversation", () => {
  it("does not recommend alcohol before the age gate", () => {
    const reply = respondToWhatsApp({ message: "Quiero un vino para ceviche", ageVerified: false });
    expect(reply.intent).toBe("age_gate");
    expect(reply.suggestionSlugs).toEqual([]);
  });

  it("records an affirmative age response without showing products yet", () => {
    const reply = respondToWhatsApp({ message: "Sí, soy mayor de edad", ageVerified: false });
    expect(reply.intent).toBe("age_confirmed");
    expect(reply.ageVerified).toBe(true);
  });

  it("recommends catalog products and returns safe cart items after age verification", () => {
    const reply = respondToWhatsApp({ message: "Busco vino para ceviche", ageVerified: true });
    expect(reply.intent).toBe("recommendation");
    expect(reply.suggestionSlugs).toContain("1700-msnm-torrontes");
    expect(reply.checkoutItems).toEqual(
      expect.arrayContaining([{ productId: "1700-torrontes", quantity: 1 }]),
    );
  });

  it("honors a marketing opt-out", () => {
    const reply = respondToWhatsApp({ message: "PARAR promociones", ageVerified: true });
    expect(reply.intent).toBe("opt_out");
    expect(reply.withdrawMarketingConsent).toBe(true);
  });
});
