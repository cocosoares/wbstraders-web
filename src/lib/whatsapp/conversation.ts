import { PRODUCTS_BY_SLUG } from "@/data/products";
import { DELIVERY_ZONES } from "@/data/delivery-zones";
import { discreteTotalCents, tierUnitCents } from "@/lib/pricing";
import { localRecommend } from "@/lib/sommelier";
import { formatPEN } from "@/lib/utils";
import type { WhatsAppCartItem } from "./cart-link";
import {
  isWhatsAppJourneyFresh,
  mergeWhatsAppQualification,
  type WhatsAppJourneyPath,
  type WhatsAppJourneyStage,
  type WhatsAppJourneyState,
  type WhatsAppQualificationData,
} from "./journey";
import type { WhatsAppActionButton, WhatsAppReplyButton } from "./rich-message";

export type WhatsAppIntent =
  | "greeting"
  | "discovery"
  | "qualification"
  | "recommendation"
  | "shipping"
  | "order_support"
  | "catalog"
  | "lead_capture"
  | "human_handoff"
  | "horeca"
  | "opt_out";

export type WhatsAppLeadData = WhatsAppQualificationData;

export type WhatsAppBotReply = {
  intent: WhatsAppIntent;
  text: string;
  suggestionSlugs: string[];
  checkoutItems?: WhatsAppCartItem[];
  replyButtons?: WhatsAppReplyButton[];
  actionButtons?: WhatsAppActionButton[];
  productImage?: { path: string; fileName: string; caption: string };
  footer?: string;
  leadData?: WhatsAppLeadData;
  journey?: WhatsAppJourneyState;
  marketingLead?: { email: string; name?: string };
  requiresHuman?: boolean;
  withdrawMarketingConsent?: boolean;
};

const MAIN_MENU: WhatsAppReplyButton[] = [
  { id: "choose_wine", text: "Elegir un vino 🍷" },
  { id: "see_catalog", text: "Ver catálogo 📚" },
  { id: "see_promotions", text: "Promociones ✨" },
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

const RECOMMENDATION_MENU: WhatsAppReplyButton[] = [
  { id: "accept_selection", text: "Comprar selección 🛒" },
  { id: "change_selection", text: "Cambiar opción 🔄" },
  { id: "human_handoff", text: "Hablar con asesor" },
];

const ADJUSTMENT_MENU: WhatsAppReplyButton[] = [
  { id: "adjust_cheaper", text: "Más económico" },
  { id: "adjust_premium", text: "Más premium" },
  { id: "adjust_style", text: "Otro estilo" },
];

const BUDGET_MENU: WhatsAppReplyButton[] = [
  { id: "budget_100", text: "Hasta S/100" },
  { id: "budget_250", text: "S/100–250" },
  { id: "budget_premium", text: "Más de S/250" },
];

const CATALOG_MENU: WhatsAppReplyButton[] = [
  { id: "catalog_reds", text: "Tintos 🍷" },
  { id: "catalog_fresh", text: "Blancos y brindis 🥂" },
];

const HORECA_BUSINESS_MENU: WhatsAppReplyButton[] = [
  { id: "horeca_restaurant", text: "Restaurante 🍽️" },
  { id: "horeca_hotel", text: "Hotel 🏨" },
  { id: "horeca_bar", text: "Bar / tienda 🍷" },
];

const HORECA_VOLUME_MENU: WhatsAppReplyButton[] = [
  { id: "horeca_6_12", text: "6–12 botellas" },
  { id: "horeca_13_48", text: "13–48 botellas" },
  { id: "horeca_49_plus", text: "49+ botellas" },
];

// GREEN API normally returns the visible button label, but some WhatsApp
// clients return only `selectedId`. Translate the stable IDs so the sales
// conversation always advances instead of asking the previous question again.
const BUTTON_SELECTION_TEXT: Record<string, string> = {
  "choose wine": "quiero elegir un vino",
  "see packs": "quiero ver packs",
  "see catalog": "ver catalogo",
  "see promotions": "quiero ver promociones",
  "horeca restaurant": "restaurante horeca",
  "horeca hotel": "hotel horeca",
  "horeca bar": "bar horeca",
  "horeca 6 12": "6 12 botellas horeca",
  "horeca 13 48": "13 48 botellas horeca",
  "horeca 49 plus": "49 botellas horeca",
  "track order": "mi pedido",
  "catalog reds": "catalogo tintos",
  "catalog fresh": "catalogo blancos y brindis",
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
  "accept selection": "comprar seleccion",
  "change selection": "cambiar opcion",
  "adjust cheaper": "mas economico",
  "adjust premium": "mas premium",
  "adjust style": "otro estilo",
  "human handoff": "hablar con asesor",
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

function journey(
  path: WhatsAppJourneyPath,
  stage: WhatsAppJourneyStage,
  leadData?: WhatsAppLeadData,
): WhatsAppJourneyState {
  return {
    path,
    stage,
    ...(leadData && Object.keys(leadData).length ? { qualification: leadData } : {}),
  };
}

function isHorecaIntent(value: string): boolean {
  return /\b(horeca|restaurante|restaurant|hotel|bar|cafeteria|empresa|corporativ|mayorista|distribuidor|volumen)\b/.test(
    value,
  );
}

function detectHorecaBusiness(value: string): WhatsAppLeadData["horecaBusinessType"] {
  if (/restaurante|restaurant/.test(value)) return "restaurant";
  if (/hotel/.test(value)) return "hotel";
  if (/bar|tienda|licoreria|licorería/.test(value)) return "bar";
  if (/empresa|corporativ|evento/.test(value)) return "company";
  if (/otro/.test(value)) return "other";
  return undefined;
}

function detectHorecaVolume(value: string): WhatsAppLeadData["horecaVolume"] {
  if (/(49\+|49 mas|50\+|50 mas|mayorista|volumen)/.test(value)) return "49_plus";
  if (/(13\s*(?:-|a)\s*48|13 48)/.test(value)) return "13_48";
  if (/(6\s*(?:-|a)\s*12|6 12)/.test(value)) return "6_12";
  return undefined;
}

function horecaReply(leadData: WhatsAppLeadData): WhatsAppBotReply {
  if (!leadData.horecaBusinessType) {
    return {
      intent: "horeca",
      text: "¡Excelente! 🍷 Preparamos propuestas para restaurantes, hoteles, bares y empresas. ¿Qué tipo de negocio tienes?",
      suggestionSlugs: [],
      replyButtons: HORECA_BUSINESS_MENU,
      footer: "También puedes escribir tu tipo de negocio y la cantidad aproximada.",
      leadData,
      journey: journey("horeca", "horeca_business", leadData),
    };
  }
  if (!leadData.horecaVolume) {
    return {
      intent: "horeca",
      text: "Perfecto. Para prepararte una selección y condiciones adecuadas, ¿qué volumen aproximado buscas?",
      suggestionSlugs: [],
      replyButtons: HORECA_VOLUME_MENU,
      footer: "La propuesta se adapta a tu carta, presupuesto y frecuencia de reposición.",
      leadData,
      journey: journey("horeca", "horeca_volume", leadData),
    };
  }
  return {
    intent: "horeca",
    text: "¡Gracias! 🙌 Ya avisé al equipo comercial para preparar una propuesta. Si deseas, deja aquí el nombre del negocio, distrito y qué estilo de vinos buscas; así la respuesta será más precisa.",
    suggestionSlugs: [],
    footer: "Atención comercial personalizada por WhatsApp.",
    leadData,
    journey: journey("horeca", "horeca_handoff", leadData),
    requiresHuman: true,
  };
}

function extractEmail(value: string): string | undefined {
  const match = value.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,63}\b/i);
  return match?.[0]?.toLowerCase();
}

function extractLeadName(value: string, email: string): string | undefined {
  const name = value
    .replace(email, "")
    .replace(/\b(acepto|aceptar|ofertas|oferta|recibir|quiero|deseo|suscribirme|suscripcion)\b/gi, " ")
    .replace(/[^a-zA-ZÀ-ÿñÑ'\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return name.length >= 2 && name.length <= 80 ? name : undefined;
}

function catalogProductButton(
  product: NonNullable<ReturnType<typeof PRODUCTS_BY_SLUG.get>>,
): WhatsAppActionButton {
  return {
    type: "url",
    id: `product_${product.slug}`,
    text: `Ver ${product.name}`.slice(0, 25),
    url: `/producto/${product.slug}`,
  };
}

function catalogCollectionReply(
  title: string,
  productSlugs: readonly string[],
): WhatsAppBotReply {
  const products = productSlugs
    .map((slug) => PRODUCTS_BY_SLUG.get(slug))
    .flatMap((product) => (product ? [product] : []))
    .slice(0, 3);
  const featured = products[0];
  if (!featured) {
    return {
      intent: "catalog",
      text: "El catálogo se está actualizando. Puedes revisar todas las etiquetas disponibles en nuestra web.",
      suggestionSlugs: [],
      actionButtons: [{ type: "url", id: "catalog_web", text: "Ver catálogo web", url: "/catalogo" }],
      journey: journey("catalog", "catalog_browse"),
    };
  }

  return {
    intent: "catalog",
    text: [
      `📚 *${title}*`,
      ...products.map(
        (product, index) =>
          `${index + 1}. *${product.name}* — ${product.tastingNotes.split(".")[0]}. Desde ${formatPEN(tierUnitCents(product.tiers[0]))}.`,
      ),
      "\nToca cada botón para ver fotos, ficha y comprar desde la web.",
    ].join("\n"),
    suggestionSlugs: products.map((product) => product.slug),
    actionButtons: products.map(catalogProductButton),
    ...(featured.image
      ? {
          productImage: {
            path: featured.image,
            fileName: featured.image.split("/").at(-1) ?? `${featured.slug}.webp`,
            caption: `🍷 ${featured.name} · ${featured.region}`,
          },
        }
      : {}),
    footer: "Catálogo WBStraders · Delivery en Lima",
    journey: journey("catalog", "catalog_browse"),
  };
}

function catalogReply(normalizedMessage: string): WhatsAppBotReply | undefined {
  if (/catalogo tintos|tintos catalogo/.test(normalizedMessage)) {
    return catalogCollectionReply("Tintos para descubrir", [
      "rn40-malbec",
      "livvera-malbec",
      "casa-malbec",
    ]);
  }
  if (/catalogo blancos|catalogo.*brindis|blancos y brindis/.test(normalizedMessage)) {
    return catalogCollectionReply("Blancos y vinos para brindar", [
      "1700-msnm-torrontes",
      "casa-sauvignon-blanc",
      "finca-ambrosia-brut-nature",
    ]);
  }
  if (/\bcatalogo\b|\bproductos\b/.test(normalizedMessage)) {
    return {
      intent: "catalog",
      text: "📚 *Catálogo WBStraders*\nExplora una selección por estilo o descarga el catálogo completo en PDF.",
      suggestionSlugs: [],
      replyButtons: CATALOG_MENU,
      actionButtons: [
        {
          type: "url",
          id: "catalog_pdf",
          text: "Descargar PDF 📥",
          url: "/catalogos/fiestas-patrias-2026.pdf",
        },
      ],
      footer: "Puedes volver a escribir MENÚ cuando quieras.",
      journey: journey("catalog", "catalog_browse"),
    };
  }
  return undefined;
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

function adjustedProductSlug(
  lead: WhatsAppLeadData,
  direction: "cheaper" | "premium",
): string | undefined {
  const current = lead.recommendedProductSlug
    ? PRODUCTS_BY_SLUG.get(lead.recommendedProductSlug)
    : undefined;
  if (!current) return undefined;
  const currentPrice = tierUnitCents(current.tiers[0]);
  const candidates = Array.from(PRODUCTS_BY_SLUG.values())
    .filter((product) => product.slug !== current.slug)
    .filter((product) => {
      if (lead.wineStyle === "tinto") return product.type === "Tinto";
      if (lead.wineStyle === "blanco") return product.type === "Blanco";
      if (lead.wineStyle === "espumante") return product.type === "Espumante";
      return true;
    })
    .map((product) => ({ product, price: tierUnitCents(product.tiers[0]) }))
    .filter(({ price }) => direction === "cheaper" ? price < currentPrice : price > currentPrice)
    .sort((a, b) =>
      direction === "cheaper" ? b.price - a.price : a.price - b.price,
    );
  return candidates[0]?.product.slug;
}

function recommendationReply(context: string, lead: WhatsAppLeadData): WhatsAppBotReply {
  const selectedSlug =
    lead.recommendedProductSlug && PRODUCTS_BY_SLUG.has(lead.recommendedProductSlug)
      ? lead.recommendedProductSlug
      : undefined;
  const suggestionSlugs = [
    ...(selectedSlug ? [selectedSlug] : []),
    ...chooseSuggestions(context, lead),
  ]
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
      journey: journey("wine", "wine_occasion", lead),
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
  const actionButtons: WhatsAppActionButton[] = [
    {
      type: "url",
      id: `product_${primary.slug}`,
      text: "Ver este vino",
      url: `/producto/${primary.slug}`,
    },
    ...(alternative
      ? [
          {
            type: "url" as const,
            id: `product_${alternative.slug}`,
            text: "Ver alternativa",
            url: `/producto/${alternative.slug}`,
          },
        ]
      : []),
  ];

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
    replyButtons: RECOMMENDATION_MENU,
    actionButtons,
    ...(primary.image
      ? {
          productImage: {
            path: primary.image,
            fileName: primary.image.split("/").at(-1) ?? `${primary.slug}.webp`,
            caption: `🍷 ${primary.name} · ${primary.region}`,
          },
        }
      : {}),
    footer: "Puedes comprar la selección o escribir CAMBIAR para ajustar precio o estilo.",
    leadData: { ...lead, recommendedProductSlug: primary.slug },
    journey: journey("wine", "recommendation_ready", {
      ...lead,
      recommendedProductSlug: primary.slug,
    }),
  };
}

function checkoutReadyReply(
  lead: WhatsAppLeadData,
  context: string,
): WhatsAppBotReply {
  const product =
    (lead.recommendedProductSlug
      ? PRODUCTS_BY_SLUG.get(lead.recommendedProductSlug)
      : undefined) ??
    PRODUCTS_BY_SLUG.get(chooseSuggestions(context, lead)[0] ?? "");
  if (!product) return recommendationReply(context, lead);
  const quantity = requestedQuantity(lead.purchaseFormat, product);

  return {
    intent: "recommendation",
    text: `¡Excelente elección! 🙌 Preparé tu selección de *${product.name}*. Toca el botón para revisar cantidades, datos de entrega, comprobante y pago en la web segura de WBStraders.`,
    suggestionSlugs: [product.slug],
    checkoutItems: [{ productId: product.id, quantity }],
    actionButtons: [
      {
        type: "url",
        id: `product_${product.slug}`,
        text: "Revisar el vino",
        url: `/producto/${product.slug}`,
      },
    ],
    footer: "La compra y el pago se completan únicamente en la web oficial de WBStraders.",
    leadData: { ...lead, recommendedProductSlug: product.slug },
    journey: journey("wine", "checkout_ready", {
      ...lead,
      recommendedProductSlug: product.slug,
    }),
  };
}

export function respondToWhatsApp(args: {
  message: string;
  recentInboundMessages?: readonly string[];
  journey?: WhatsAppJourneyState;
  /** Kept for backwards compatibility. The sales chat no longer asks for an age confirmation. */
  ageVerified?: boolean;
}): WhatsAppBotReply {
  const incomingMessage = args.message.trim().slice(0, 1_500);
  const normalizedIncomingMessage = normalize(incomingMessage);
  const message =
    BUTTON_SELECTION_TEXT[normalizedIncomingMessage] ??
    BUTTON_SELECTION_TEXT[normalizedIncomingMessage.replace(/_/g, " ")] ??
    incomingMessage;
  const normalizedMessage = normalize(message);
  const exactGreeting = /^(hola|holi|buenas|buenos dias|buenas tardes|buenas noches|menu)$/.test(normalizedMessage);
  const menuSelection = [
    "choose wine",
    "elegir un vino",
    "see catalog",
    "ver catalogo",
    "see promotions",
    "promociones",
  ].includes(normalizedIncomingMessage.replace(/_/g, " "));
  const restartJourney = exactGreeting || menuSelection;
  const activeJourney = !restartJourney && isWhatsAppJourneyFresh(args.journey) ? args.journey : undefined;
  const context = buildContext(message, restartJourney ? [] : args.recentInboundMessages ?? []);
  const normalizedContext = normalize(context);

  if (/\b(parar|stop|baja|no promociones|cancelar suscripcion)\b/.test(normalizedMessage)) {
    return {
      intent: "opt_out",
      text: "Listo ✅ No volveremos a enviarte promociones por WhatsApp. Puedes escribirnos cuando necesites ayuda con un pedido o una recomendación.",
      suggestionSlugs: [],
      withdrawMarketingConsent: true,
      journey: journey("support", "marketing_opt_in"),
    };
  }

  const submittedEmail = extractEmail(incomingMessage);
  const explicitlyAcceptsOffers = /\b(acepto|aceptar|si acepto|deseo recibir)\b/.test(normalizedMessage);
  // “Promociones” is a purchase-intent entry point: show the current published
  // selections first. Ask for email only when the customer explicitly asks to
  // receive future communications, never just because they want to see offers.
  const asksForMarketingUpdates =
    /\b(recibir|enviame|mandame|suscribirme|suscripcion|avisame|notificarme)\b.*\b(ofertas|novedades|promociones)\b/.test(
      normalizedMessage,
    );

  if (explicitlyAcceptsOffers && submittedEmail) {
    const name = extractLeadName(incomingMessage, submittedEmail);
    return {
      intent: "lead_capture",
      text: `¡Listo${name ? `, ${name}` : ""}! ✅ Guardé tu correo para enviarte novedades, maridajes y ofertas de WBStraders. Puedes pedir la baja cuando quieras escribiendo PARAR.`,
      suggestionSlugs: [],
      marketingLead: { email: submittedEmail, ...(name ? { name } : {}) },
      footer: "Suscripción opcional · Puedes darte de baja en cualquier momento.",
      journey: journey("support", "marketing_opt_in"),
    };
  }

  if (asksForMarketingUpdates || submittedEmail) {
    return {
      intent: "lead_capture",
      text: "Con gusto. Es opcional y no afecta tu compra. Para autorizar el envío de ofertas, maridajes y novedades por correo, responde en un solo mensaje: *ACEPTO Tu nombre correo@ejemplo.com*.",
      suggestionSlugs: [],
      footer: "Solo usaremos tu correo para comunicaciones de WBStraders. Puedes darte de baja cuando quieras.",
      journey: journey("support", "marketing_opt_in"),
    };
  }

  const horecaLead: WhatsAppLeadData = {
    ...(activeJourney?.qualification ?? {}),
    customerType: "horeca",
    horecaBusinessType:
      detectHorecaBusiness(normalizedMessage) ??
      detectHorecaBusiness(normalizedContext) ??
      activeJourney?.qualification?.horecaBusinessType,
    horecaVolume:
      detectHorecaVolume(normalizedMessage) ??
      detectHorecaVolume(normalizedContext) ??
      activeJourney?.qualification?.horecaVolume,
  };
  if (activeJourney?.path === "horeca" || isHorecaIntent(normalizedContext)) {
    return horecaReply(horecaLead);
  }

  if (/\b(humano|persona|asesor|vendedor|hablar con alguien|reclamo|queja)\b/.test(normalizedMessage)) {
    return {
      intent: "human_handoff",
      text: "Claro 🙋 Ya avisé al equipo de WBStraders para que continúe contigo por este chat. Si deseas, deja aquí el detalle y lo encontrará al responder.",
      suggestionSlugs: [],
      requiresHuman: true,
      journey: journey("support", "human_handoff"),
    };
  }

  if (/\bwbs[-\s]?\d{4}[-\s]?\d{4,}\b/.test(normalizedMessage)) {
    return {
      intent: "order_support",
      text: "Gracias 📦 Ya registré tu número de pedido. Un miembro del equipo revisará el estado y continuará contigo por este chat.",
      suggestionSlugs: [],
      requiresHuman: true,
      journey: journey("support", "order_support"),
    };
  }

  if (/\b(mi pedido|pedido|orden|seguimiento|donde esta|estado de compra)\b/.test(normalizedMessage)) {
    return {
      intent: "order_support",
      text: "Te ayudo con tu pedido 📦 Envíame el número de orden que recibiste por correo (por ejemplo, WBS-2026-000001).",
      suggestionSlugs: [],
      footer: "No compartas datos bancarios ni contraseñas.",
      journey: journey("support", "order_support"),
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
        journey: journey("support", "shipping"),
      };
    }
    return {
      intent: "shipping",
      text: `🚚 *${zone.name}*\nEntrega estimada: ${zone.eta.toLowerCase()}.\nTarifa: ${formatPEN(zone.costCents)}. Envío gratis desde ${formatPEN(zone.freeFromCents)}.\n\n¿Quieres que te ayude a elegir el vino?`,
      suggestionSlugs: [],
      replyButtons: MAIN_MENU,
      footer: "La tarifa final se confirma con la dirección del checkout.",
      journey: journey("support", "shipping"),
    };
  }

  if (exactGreeting) {
    return {
      intent: "greeting",
      text: "¡Hola! 👋 Soy el sommelier virtual de *WBStraders*. Te ayudo a elegir vinos argentinos para tu comida, regalo o celebración.\n\n¿Qué te gustaría hacer? Para revisar un pedido, escribe *MI PEDIDO*.",
      suggestionSlugs: [],
      replyButtons: MAIN_MENU,
      footer: "Atención personalizada · Catálogo PDF disponible dentro de “Ver catálogo”",
      journey: journey("wine", "menu"),
    };
  }

  const catalog = catalogReply(normalizedMessage);
  if (catalog) return catalog;

  const savedLead = activeJourney?.qualification ?? {};
  if (
    activeJourney?.stage === "recommendation_ready" &&
    /\b(comprar seleccion|lo quiero|me gusta|comprar|continuar)\b/.test(normalizedMessage)
  ) {
    return checkoutReadyReply(savedLead, normalizedContext);
  }

  if (
    activeJourney?.stage === "recommendation_ready" &&
    /\b(cambiar opcion|otra opcion|no me convence|ver otro)\b/.test(normalizedMessage)
  ) {
    return {
      intent: "qualification",
      text: "Claro 👍 No necesitas empezar de nuevo. ¿Qué quieres cambiar de la recomendación?",
      suggestionSlugs: [],
      replyButtons: ADJUSTMENT_MENU,
      footer: "Mantendré la comida, ocasión y cantidad que ya me indicaste.",
      leadData: savedLead,
      journey: journey("wine", "recommendation_adjust", savedLead),
    };
  }

  if (
    activeJourney?.stage === "recommendation_adjust" &&
    /\b(mas economico|más económico)\b/.test(normalizedMessage)
  ) {
    const recommendedProductSlug = adjustedProductSlug(savedLead, "cheaper");
    return recommendationReply(normalizedContext, {
      ...savedLead,
      ...(recommendedProductSlug ? { recommendedProductSlug } : { budget: "under_100" }),
    });
  }

  if (
    activeJourney?.stage === "recommendation_adjust" &&
    /\b(mas premium|más premium)\b/.test(normalizedMessage)
  ) {
    const recommendedProductSlug = adjustedProductSlug(savedLead, "premium");
    return recommendationReply(normalizedContext, {
      ...savedLead,
      ...(recommendedProductSlug ? { recommendedProductSlug } : { budget: "over_250" }),
    });
  }

  if (
    activeJourney?.stage === "recommendation_adjust" &&
    /\b(otro estilo|cambiar estilo)\b/.test(normalizedMessage)
  ) {
    const leadWithoutStyle = { ...savedLead };
    delete leadWithoutStyle.wineStyle;
    delete leadWithoutStyle.recommendedProductSlug;
    return {
      intent: "qualification",
      text: "Perfecto. ¿Qué estilo prefieres probar ahora?",
      suggestionSlugs: [],
      replyButtons: STYLE_MENU,
      leadData: leadWithoutStyle,
      journey: journey("wine", "wine_occasion", leadWithoutStyle),
    };
  }

  const detectedLead: WhatsAppLeadData = {
    occasion: detectOccasion(normalizedMessage) ?? detectOccasion(normalizedContext),
    wineStyle: detectWineStyle(normalizedMessage) ?? detectWineStyle(normalizedContext),
    purchaseFormat: detectPurchaseFormat(normalizedMessage) ?? detectPurchaseFormat(normalizedContext),
    budget: detectBudget(normalizedMessage) ?? detectBudget(normalizedContext),
  };
  const lead = mergeWhatsAppQualification(activeJourney?.qualification, detectedLead) ?? {};

  const wantsPacks = activeJourney?.path === "promotions" || /pack|promo|oferta|ahorro/.test(normalizedContext);
  const wantsRecommendation = /elegir|recomiend|busco|quiero|vino|botella|sommelier/.test(normalizedContext);

  if (wantsPacks && !lead.wineStyle && !lead.occasion) {
    return {
      intent: "qualification",
      text: "✨ Tenemos selecciones con mejor precio por botella. ¿Qué estilo te provoca más hoy?",
      suggestionSlugs: [],
      replyButtons: STYLE_MENU,
      footer: "Elige tintos, blancos o un surtido; te mostraré opciones reales de la tienda.",
      leadData: lead,
      journey: journey("promotions", "promotion_style", lead),
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
      journey: journey("wine", "wine_occasion", lead),
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
      journey: journey("wine", "gift_choice", lead),
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
      journey: journey("wine", "gift_budget", lead),
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
      journey: journey(wantsPacks ? "promotions" : "wine", wantsPacks ? "promotion_format" : "wine_format", lead),
    };
  }

  return {
    ...recommendationReply(context, lead),
    journey: journey(wantsPacks ? "promotions" : "wine", "recommendation_ready", lead),
  };
}
