import { describe, expect, it } from "vitest";
import { respondToWhatsApp } from "./conversation";

describe("WhatsApp sommelier conversation", () => {
  it("greets the customer with a compact menu without duplicating the catalog", () => {
    const reply = respondToWhatsApp({ message: "Hola" });
    expect(reply.intent).toBe("greeting");
    expect(reply.text).toContain("sommelier virtual");
    expect(reply.text).not.toContain("18 años");
    expect(reply.replyButtons).toHaveLength(3);
    expect(reply.replyButtons?.map((button) => button.text)).toContain("Elegir un vino 🍷");
    expect(reply.replyButtons?.map((button) => button.text)).toEqual([
      "Elegir un vino 🍷",
      "Ver catálogo 📚",
      "Promociones ✨",
    ]);
    expect(reply.actionButtons).toBeUndefined();
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

  it("takes the promotions entry point to published pack selections", () => {
    const reply = respondToWhatsApp({ message: "see_promotions" });

    expect(reply.intent).toBe("qualification");
    expect(reply.text).toContain("mejor precio por botella");
    expect(reply.replyButtons?.map((button) => button.id)).toEqual([
      "style_red",
      "style_white",
      "style_mix",
    ]);
  });

  it("resumes a fresh recommendation without relying on the entire message history", () => {
    const reply = respondToWhatsApp({
      message: "1 botella",
      journey: {
        path: "wine",
        stage: "wine_format",
        qualification: { occasion: "parrilla y carnes" },
        updatedAt: new Date().toISOString(),
      },
    });

    expect(reply.intent).toBe("recommendation");
    expect(reply.suggestionSlugs).toContain("rn40-malbec");
    expect(reply.journey?.stage).toBe("recommendation_ready");
    expect(reply.checkoutItems).toBeUndefined();
    expect(reply.replyButtons?.map((button) => button.id)).toContain("accept_selection");
  });

  it("does not reuse an expired recommendation state", () => {
    const reply = respondToWhatsApp({
      message: "1 botella",
      journey: {
        path: "wine",
        stage: "wine_format",
        qualification: { occasion: "parrilla y carnes" },
        updatedAt: new Date(Date.now() - 31 * 60 * 1_000).toISOString(),
      },
    });

    expect(reply.journey?.stage).toBe("wine_occasion");
    expect(reply.suggestionSlugs).toEqual([]);
  });

  it("qualifies HORECA leads before handing them to a person", () => {
    const volumeQuestion = respondToWhatsApp({ message: "Tengo un restaurante" });
    expect(volumeQuestion.intent).toBe("horeca");
    expect(volumeQuestion.journey?.stage).toBe("horeca_volume");
    expect(volumeQuestion.replyButtons?.map((button) => button.id)).toContain("horeca_13_48");

    const handoff = respondToWhatsApp({
      message: "13–48 botellas",
      journey: {
        path: "horeca",
        stage: "horeca_volume",
        qualification: { customerType: "horeca", horecaBusinessType: "restaurant" },
        updatedAt: new Date().toISOString(),
      },
    });
    expect(handoff.requiresHuman).toBe(true);
    expect(handoff.leadData).toMatchObject({
      customerType: "horeca",
      horecaBusinessType: "restaurant",
      horecaVolume: "13_48",
    });
  });

  it("asks for permission only when a customer asks to receive future promotions", () => {
    const reply = respondToWhatsApp({ message: "Quiero recibir promociones" });

    expect(reply.intent).toBe("lead_capture");
    expect(reply.text).toContain("ACEPTO");
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
    expect(reply.checkoutItems).toBeUndefined();
    expect(reply.productImage?.path).toBe("/products/1700-msnm-torrontes-cutout.webp");
    expect(reply.text).toContain("1700 msnm Torrontés");
    expect(reply.text).toContain("S/");
  });

  it("creates the secure web checkout only after the customer accepts the recommendation", () => {
    const reply = respondToWhatsApp({
      message: "accept_selection",
      journey: {
        path: "wine",
        stage: "recommendation_ready",
        qualification: {
          occasion: "parrilla y carnes",
          purchaseFormat: "single",
          recommendedProductSlug: "rn40-malbec",
        },
        updatedAt: new Date().toISOString(),
      },
    });

    expect(reply.intent).toBe("recommendation");
    expect(reply.journey?.stage).toBe("checkout_ready");
    expect(reply.checkoutItems).toEqual([{ productId: "rn40-malbec", quantity: 1 }]);
    expect(reply.text).toContain("web segura de WBStraders");
  });

  it("lets the customer adjust a recommendation without restarting qualification", () => {
    const change = respondToWhatsApp({
      message: "change_selection",
      journey: {
        path: "wine",
        stage: "recommendation_ready",
        qualification: {
          occasion: "parrilla y carnes",
          purchaseFormat: "single",
          recommendedProductSlug: "rn40-malbec",
        },
        updatedAt: new Date().toISOString(),
      },
    });
    expect(change.journey?.stage).toBe("recommendation_adjust");
    expect(change.replyButtons?.map((button) => button.id)).toEqual([
      "adjust_cheaper",
      "adjust_premium",
      "adjust_style",
    ]);

    const cheaper = respondToWhatsApp({
      message: "adjust_cheaper",
      journey: {
        ...change.journey!,
        updatedAt: new Date().toISOString(),
      },
    });
    expect(cheaper.intent).toBe("recommendation");
    expect(cheaper.journey?.stage).toBe("recommendation_ready");
    expect(cheaper.leadData?.occasion).toBe("parrilla y carnes");
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
