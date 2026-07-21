import { PRODUCTS_BY_SLUG } from "@/data/products";
import { DELIVERY_ZONES } from "@/data/delivery-zones";
import { discreteTotalCents, tierUnitCents } from "@/lib/pricing";
import { localRecommend } from "@/lib/sommelier";
import { formatPEN } from "@/lib/utils";
import type { WhatsAppCartItem } from "./cart-link";
import type { WhatsAppReplyButton } from "./rich-message";

export type WhatsAppIntent =
  | "greeting"
  | "discovery"
  | "qualification"
  | "recommendation"
  | "shipping"
  | "order_support"
  | "human_handoff"
  | "opt_out";

export type WhatsAppLeadData = {
  occasion?: string;
  wineStyle?: string;
  purchaseFormat?: "single" | "pack" | "case";
  budget?: "under_100" | "100_250" | "over_250";
};

export type WhatsAppBotReply = {
  intent: WhatsAppIntent;
  text: string;
  suggestionSlugs: string[];
  checkoutItems?: WhatsAppCartItem[];
  replyButtons?: WhatsAppReplyButton[];
  productImage?: { path: string; fileName: string; caption: string };
  footer?: string;
  leadData?: WhatsAppLeadData;
  requiresHuman?: boolean;
  withdrawMarketingConsent?: boolean;
};

const MAIN_MENU: WhatsAppReplyButton[] = [
  { id: "choose_wine", text: "Elegir un vino 🍷" },
  { id: "see_packs", text: "Ver packs 🎁" },
  { id: "track_order", text: "Mi pedido 📦" },
];

const OCCASION_MENU: WhatsAppReplyButton[] = [
  { id: "occasion_seafood", text: "Ceviche / pescados" },
  { id: "occasion_grill", text: "Parrilla / carnes" },
  { id: "occasion_gift", text: "Regalo / celebración" },
];

const STYLE_MENU: WhatsAppReplyButton[] = [
  { id: "style_red", text: "Tintos 🍷" },
  { id: "style_white", text: "Blancos 🥂" },
  { id: "style_mix", text: "Surtido ✨" },
];

const FORMAT_MENU: WhatsAppReplyButton[] = [
  { id: "format_single", text: "1 botella" },
  { id: "format_pack", text: "Pack con ahorro" },
  { id: "format_case", text: "Caja / surtido" },
];

const BUDGET_MENU: WhatsAppReplyButton[] = [
  { id: "budget_100", text: "Hasta S/100" },
  { id: "budget_250", text: "S/100–250" },
  { id: "budget_premium", text: "Más de S/250" },
];

// GREEN API normally returns the visible button label, but some WhatsApp
// clients return only `selectedId`. Translate the stable IDs so the sales
// conversation always advances instead of asking the previous question again.
const BUTTON_SELECTION_TEXT: Record<string, string> = {
  "choose wine": "quiero elegir un vino",
  "see packs": "quiero ver packs",
  "track order": "mi pedido",
  "occasion seafood": "ceviche y pescados",
  "occasion grill": "parrilla y carnes",
  "occasion gift": "regalo y celebracion",
  "special gift": "regalo",
  "special toast": "celebracion",
  "style red": "tinto",
  "style white": "blanco",
  "style mix": "surtido",
  "format single": "1 botella",
  "format pack": "pack con ahorro",
  "format case": "caja surtida",
  "budget 100": "hasta s/100",
  "budget 250": "s/100-250",
  "budget premium": "mas de s/250",
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9+\s/.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildContext(message: string, recentInboundMessages: readonly string[]): string {
  const history = recentInboundMessages
    .map((entry) => entry.trim().slice(0, 1_500))
    .filter(Boolean)
    .slice(-8);
  if (!history.length || normalize(history.at(-1) ?? "") !== normalize(message)) {
    history.push(message);
  }
  return history.join(" · ").slice(-6_000);
}

function detectOccasion(text: string): string | undefined {
  if (/cevich|tiradito|pescad|marisc|sushi|nikkei|concha/.test(text)) return "ceviche y pescados";
  if (/parrilla|asado|carne|lomo|anticuch|bife|cordero|costilla/.test(text)) return "parrilla y carnes";
  if (/regal/.test(text) && /celebra|brindis|fiesta/.test(text)) return "regalo o celebración";
  if (/regal|detalle|sorprend|impresionar/.test(text)) return "regalo";
  if (/celebra|brindis|cumple|aniversario|boda|fiesta/.test(text)) return "celebración";
  if (/pasta|pizza|lasagn|tallarin|bolo/.test(text)) return "pastas y pizza";
  if (/pollo|hamburguesa/.test(text)) return "comida casual";
  if (/terraza|piqueo|verano|tarde/.test(text)) return "terraza y piqueo";
  return undefined;
}

function detectWineStyle(text: string): string | undefined {
  if (/surtid|mixto|mix /.test(text)) return "surtido";
  if (/espumante|brut|champ/.test(text)) return "espumante";
  if (/rosado|rose/.test(text)) return "rosado";
  if (/blanco|torrontes|sauvignon|malvasia/.test(text)) return "blanco";
  if (/tinto|malbec|cabernet|bonarda/.test(text)) return "tinto";
  return undefined;
}

function detectPurchaseFormat(text: string): WhatsAppLeadData["purchaseFormat"] {
  if (/caja|6\+|6 botell|12 botell|surtido/.test(text)) return "case";
  if (/pack con ahorro|pack sugerido|2 botell|3 botell|4 botell|varias botell/.test(text)) return "pack";
  if (/1 botella|una botella|solo una/.test(text)) return "single";
  return undefined;
}

function detectBudget(text: string): WhatsAppLeadData["budget"] {
  if (/mas de s?\s*250|sobre s?\s*250|premium/.test(text)) return "over_250";
  if (/s?\s*100\s*[-a]\s*250|entre s?\s*100|100 250/.test(text)) return "100_250";
  if (/hasta s?\s*100|menos de s?\s*100|economico|barato|ajustado/.test(text)) return "under_100";
  return undefined;
}

function findDeliveryZone(text: string) {
  return DELIVERY_ZONES.find((zone) =>
    zone.districts.some((district) => text.includes(normalize(district))),
  );
}

function chooseSuggestions(context: string, lead: WhatsAppLeadData): string[] {
  if (lead.budget === "under_100") {
    return lead.wineStyle === "blanco"
      ? ["casa-sauvignon-blanc"]
      : ["casa-malbec", "casa-sauvignon-blanc"];
  }
  if (lead.occasion === "regalo") {
    if (lead.budget === "over_250") {
      return ["geografia-extraordinaria-tintas-de-uco", "geografia-extraordinaria-blancas-de-uco"];
    }
    return ["geografia-extraordinaria-tintas-de-uco", "finca-ambrosia-brut-nature"];
  }
  if (lead.wineStyle === "surtido") return ["casa-malbec", "casa-sauvignon-blanc"];
  if (lead.wineStyle === "espumante") return ["finca-ambrosia-brut-nature"];
  if (lead.wineStyle === "rosado") return ["livvera-sangiovese-rose", "livvera-malvasia"];
  if (lead.wineStyle === "blanco") return ["1700-msnm-torrontes", "casa-sauvignon-blanc"];
  if (lead.wineStyle === "tinto") return ["rn40-malbec", "livvera-malbec", "casa-malbec"];
  return localRecommend(context).suggestions;
}

function requestedQuantity(
  format: WhatsAppLeadData["purchaseFormat"],
  product: NonNullable<ReturnType<typeof PRODUCTS_BY_SLUG.get>>,
): number {
  if (format === "single" || !format) return 1;
  if (format === "pack") return product.tiers[1]?.minQty ?? 1;
  return product.tiers.find((tier) => tier.minQty >= 6)?.minQty ?? product.tiers.at(-1)?.minQty ?? 1;
}

function recommendationReply(context: string, lead: WhatsAppLeadData): WhatsAppBotReply {
  const suggestionSlugs = chooseSuggestions(context, lead)
    .filter((slug, index, values) => PRODUCTS_BY_SLUG.has(slug) && values.indexOf(slug) === index)
    .slice(0, 2);
  const primary = PRODUCTS_BY_SLUG.get(suggestionSlugs[0] ?? "");
  if (!primary) {
    return {
      intent: "discovery",
      text: "Quiero recomendarte algo que realmente encaje contigo 🍷. ¿Lo buscas para una comida, un regalo o una celebración?",
      suggestionSlugs: [],
      replyButtons: OCCASION_MENU,
      footer: "También puedes escribir el plato o la ocasión.",
    };
  }

  const quantity = requestedQuantity(lead.purchaseFormat, primary);
  const totalCents = discreteTotalCents(primary.tiers, quantity);
  const unitCents = Math.round(totalCents / quantity);
  const alternative = PRODUCTS_BY_SLUG.get(suggestionSlugs[1] ?? "");
  const reason = lead.occasion
    ? `Lo elegí para ${lead.occasion}.`
    : lead.wineStyle
      ? `Encaja con tu preferencia por vino ${lead.wineStyle}.`
      : "Es una selección versátil y muy gastronómica.";
  const alternativeText = alternative
    ? `\n\n✨ *Alternativa:* ${alternative.name}, ${alternative.tastingNotes.split(".")[0].toLowerCase()}. Desde ${formatPEN(tierUnitCents(alternative.tiers[0]))}.`
    : "";

  return {
    intent: "recommendation",
    text: [
      `🍷 *${primary.name}*`,
      reason,
      primary.tastingNotes.split(".").slice(0, 2).join(".").trim() + ".",
      `🍽️ Va muy bien con ${primary.pairings.slice(0, 2).join(" y ")}.`,
      `💰 ${quantity === 1 ? "1 botella" : `Selección de ${quantity} botellas`}: *${formatPEN(totalCents)}* (${formatPEN(unitCents)} c/u).`,
    ].join("\n") + alternativeText + "\n\n🛒 Dejé esta selección lista para que la revises y completes tus datos de entrega.",
    suggestionSlugs,
    checkoutItems: [{ productId: primary.id, quantity }],
    ...(primary.image
      ? {
          productImage: {
            path: primary.image,
            fileName: primary.image.split("/").at(-1) ?? `${primary.slug}.webp`,
            caption: `🍷 ${primary.name} · ${primary.region}`,
          },
        }
      : {}),
    footer: "Precio publicado · Delivery en Lima",
    leadData: lead,
  };
}

export function respondToWhatsApp(args: {
  message: string;
  recentInboundMessages?: readonly string[];
  /** Kept for backwards compatibility. The sales chat no longer asks for an age confirmation. */
  ageVerified?: boolean;
}): WhatsAppBotReply {
  const incomingMessage = args.message.trim().slice(0, 1_500);
  const normalizedIncomingMessage = normalize(incomingMessage);
  const message = BUTTON_SELECTION_TEXT[normalizedIncomingMessage] ?? incomingMessage;
  const normalizedMessage = normalize(message);
  const context = buildContext(message, args.recentInboundMessages ?? []);
  const normalizedContext = normalize(context);

  if (/\b(parar|stop|baja|no promociones|cancelar suscripcion)\b/.test(normalizedMessage)) {
    return {
      intent: "opt_out",
      text: "Listo ✅ No volveremos a enviarte promociones por WhatsApp. Puedes escribirnos cuando necesites ayuda con un pedido o una recomendación.",
      suggestionSlugs: [],
      withdrawMarketingConsent: true,
    };
  }

  if (/\b(humano|persona|asesor|vendedor|hablar con alguien|reclamo|queja)\b/.test(normalizedMessage)) {
    return {
      intent: "human_handoff",
      text: "Claro 🙋 Ya avisé al equipo de WBStraders para que continúe contigo por este chat. Si deseas, deja aquí el detalle y lo encontrará al responder.",
      suggestionSlugs: [],
      requiresHuman: true,
    };
  }

  if (/\bwbs[-\s]?\d{4}[-\s]?\d{4,}\b/.test(normalizedMessage)) {
    return {
      intent: "order_support",
      text: "Gracias 📦 Ya registré tu número de pedido. Un miembro del equipo revisará el estado y continuará contigo por este chat.",
      suggestionSlugs: [],
      requiresHuman: true,
    };
  }

  if (/\b(mi pedido|pedido|orden|seguimiento|donde esta|estado de compra)\b/.test(normalizedMessage)) {
    return {
      intent: "order_support",
      text: "Te ayudo con tu pedido 📦 Envíame el número de orden que recibiste por correo (por ejemplo, WBS-2026-000001).",
      suggestionSlugs: [],
      footer: "No compartas datos bancarios ni contraseñas.",
    };
  }

  if (/\b(envio|delivery|entrega|distrito|reparto)\b/.test(normalizedMessage)) {
    const zone = findDeliveryZone(normalizedContext);
    if (!zone) {
      return {
        intent: "shipping",
        text: "Sí hacemos delivery en Lima 🚚. Dime tu distrito y te indico la tarifa, el tiempo estimado y desde qué monto el envío es gratis.",
        suggestionSlugs: [],
        footer: "La tarifa final se confirma en el checkout.",
      };
    }
    return {
      intent: "shipping",
      text: `🚚 *${zone.name}*\nEntrega estimada: ${zone.eta.toLowerCase()}.\nTarifa: ${formatPEN(zone.costCents)}. Envío gratis desde ${formatPEN(zone.freeFromCents)}.\n\n¿Quieres que te ayude a elegir el vino?`,
      suggestionSlugs: [],
      replyButtons: MAIN_MENU,
      footer: "La tarifa final se confirma con la dirección del checkout.",
    };
  }

  const exactGreeting = /^(hola|holi|buenas|buenos dias|buenas tardes|buenas noches|menu)$/.test(normalizedMessage);
  if (exactGreeting) {
    return {
      intent: "greeting",
      text: "¡Hola! 👋 Soy el sommelier virtual de *WBStraders*. Te ayudo a elegir vinos argentinos para tu comida, regalo o celebración, y también a revisar pedidos.\n\n¿Qué te gustaría hacer?",
      suggestionSlugs: [],
      replyButtons: MAIN_MENU,
      footer: "Atención personalizada por WhatsApp",
    };
  }

  const lead: WhatsAppLeadData = {
    occasion: detectOccasion(normalizedMessage) ?? detectOccasion(normalizedContext),
    wineStyle: detectWineStyle(normalizedMessage) ?? detectWineStyle(normalizedContext),
    purchaseFormat: detectPurchaseFormat(normalizedMessage) ?? detectPurchaseFormat(normalizedContext),
    budget: detectBudget(normalizedMessage) ?? detectBudget(normalizedContext),
  };

  const wantsPacks = /pack|promo|oferta|ahorro/.test(normalizedContext);
  const wantsRecommendation = /elegir|recomiend|busco|quiero|vino|botella|sommelier/.test(normalizedContext);

  if (wantsPacks && !lead.wineStyle && !lead.occasion) {
    return {
      intent: "qualification",
      text: "Tenemos packs pensados para ahorrar sin comprar a ciegas 🎁. ¿Qué estilo prefieres?",
      suggestionSlugs: [],
      replyButtons: STYLE_MENU,
      footer: "Puedes pedir tintos, blancos o un surtido.",
      leadData: lead,
    };
  }

  if (!lead.occasion && !lead.wineStyle) {
    return {
      intent: wantsRecommendation ? "qualification" : "discovery",
      text: "Para acertar con la recomendación necesito solo un dato 🍽️ ¿Con qué comida u ocasión lo vas a disfrutar?",
      suggestionSlugs: [],
      replyButtons: OCCASION_MENU,
      footer: "También puedes escribir tu plato, gusto o presupuesto.",
      leadData: lead,
    };
  }

  if (lead.occasion === "regalo o celebración") {
    return {
      intent: "qualification",
      text: "¡Qué buena ocasión! ✨ ¿Quieres una botella para regalar o algo para brindar y compartir?",
      suggestionSlugs: [],
      replyButtons: [
        { id: "special_gift", text: "Regalo especial 🎁" },
        { id: "special_toast", text: "Brindis / fiesta 🥂" },
      ],
      footer: "Elige una opción o escribe otra ocasión.",
      leadData: lead,
    };
  }

  if (lead.occasion === "regalo" && !lead.budget) {
    return {
      intent: "qualification",
      text: "Buena elección 🎁 Para recomendarte un regalo que se sienta especial sin excederte, ¿qué presupuesto prefieres?",
      suggestionSlugs: [],
      replyButtons: BUDGET_MENU,
      footer: "Te mostraré una opción principal y una alternativa.",
      leadData: lead,
    };
  }

  if (!lead.purchaseFormat && !(lead.occasion === "regalo" && lead.budget)) {
    return {
      intent: "qualification",
      text: "Perfecto 🙌 ¿Qué formato te conviene más? Con el pack publicado obtienes un mejor precio por botella.",
      suggestionSlugs: [],
      replyButtons: FORMAT_MENU,
      footer: "La selección quedará editable antes de pagar.",
      leadData: lead,
    };
  }

  return recommendationReply(context, lead);
}
