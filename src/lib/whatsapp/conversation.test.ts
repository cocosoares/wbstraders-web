import { describe, expect, it } from "vitest";
import { respondToWhatsApp } from "./conversation";

describe("WhatsApp sommelier conversation", () => {
  it("greets the customer with a useful menu and direct catalog download", () => {
    const reply = respondToWhatsApp({ message: "Hola" });
    expect(reply.intent).toBe("greeting");
    expect(reply.text).toContain("sommelier virtual");
    expect(reply.text).not.toContain("18 años");
    expect(reply.replyButtons).toHaveLength(2);
    expect(reply.replyButtons?.map((button) => button.text)).toContain("Elegir un vino 🍷");
    expect(reply.actionButtons?.[0]).toMatchObject({
      id: "catalog_pdf",
      url: "/catalogos/fiestas-patrias-2026.pdf",
    });
  });

  it("asks one qualification question before recommending", () => {
    const reply = respondToWhatsApp({ message: "Busco vino para ceviche" });
    expect(reply.intent).toBe("qualification");
    expect(reply.text).toContain("formato");
    expect(reply.suggestionSlugs).toEqual([]);
    expect(reply.replyButtons).toHaveLength(3);
  });

  it("moves from a ceviche button to the format question", () => {
    const reply = respondToWhatsApp({ message: "Ceviche / pescados" });

    expect(reply.intent).toBe("qualification");
    expect(reply.leadData?.occasion).toBe("ceviche y pescados");
    expect(reply.replyButtons?.map((button) => button.id)).toContain("format_single");
  });

  it("moves from a gift button to the gift-or-toast question", () => {
    const reply = respondToWhatsApp({ message: "Regalo / celebraciÃ³n" });

    expect(reply.intent).toBe("qualification");
    expect(reply.replyButtons?.map((button) => button.id)).toEqual([
      "special_gift",
      "special_toast",
    ]);
  });

  it("uses a button identifier when the provider omits its visible label", () => {
    const reply = respondToWhatsApp({ message: "occasion_seafood" });

    expect(reply.intent).toBe("qualification");
    expect(reply.leadData?.occasion).toBe("ceviche y pescados");
    expect(reply.replyButtons?.map((button) => button.id)).toContain("format_single");
  });

  it("offers the catalog PDF and conversational collections", () => {
    const catalog = respondToWhatsApp({ message: "Ver catálogo" });

    expect(catalog.intent).toBe("catalog");
    expect(catalog.actionButtons?.[0]).toMatchObject({
      id: "catalog_pdf",
      url: "/catalogos/fiestas-patrias-2026.pdf",
    });
    expect(catalog.replyButtons?.map((button) => button.id)).toContain("catalog_reds");

    const reds = respondToWhatsApp({ message: "catalog_reds" });
    expect(reds.suggestionSlugs).toContain("rn40-malbec");
    expect(reds.actionButtons).toHaveLength(3);
  });

  it("adds web buttons for the recommended wine and its alternative", () => {
    const reply = respondToWhatsApp({
      message: "1 botella",
      recentInboundMessages: ["Parrilla / carnes", "1 botella"],
    });

    expect(reply.intent).toBe("recommendation");
    expect(reply.actionButtons?.map((button) => button.id)).toContain("product_rn40-malbec");
    expect(reply.actionButtons?.map((button) => button.id)).toContain("product_livvera-malbec");
  });

  it("captures an email only with explicit marketing consent", () => {
    const reply = respondToWhatsApp({ message: "ACEPTO Ana ana@example.com" });

    expect(reply.intent).toBe("lead_capture");
    expect(reply.marketingLead).toEqual({ name: "Ana", email: "ana@example.com" });
  });

  it("uses conversation context to recommend a real catalog product with photo and checkout items", () => {
    const reply = respondToWhatsApp({
      message: "Pack con ahorro",
      recentInboundMessages: ["Busco vino para ceviche", "Pack con ahorro"],
    });
    expect(reply.intent).toBe("recommendation");
    expect(reply.suggestionSlugs).toContain("1700-msnm-torrontes");
    expect(reply.checkoutItems).toEqual([{ productId: "1700-torrontes", quantity: 2 }]);
    expect(reply.productImage?.path).toBe("/products/1700-msnm-torrontes.webp");
    expect(reply.text).toContain("1700 msnm Torrontés");
    expect(reply.text).toContain("S/");
  });

  it("answers delivery questions with the configured zone data", () => {
    const reply = respondToWhatsApp({ message: "¿Cuánto cuesta el delivery a Miraflores?" });
    expect(reply.intent).toBe("shipping");
    expect(reply.text).toContain("S/ 12.00");
    expect(reply.text).toContain("24 horas");
  });

  it("honors a marketing opt-out", () => {
    const reply = respondToWhatsApp({ message: "PARAR promociones" });
    expect(reply.intent).toBe("opt_out");
    expect(reply.withdrawMarketingConsent).toBe(true);
  });
});
