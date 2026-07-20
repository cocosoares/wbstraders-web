import { PRODUCTS_BY_SLUG } from "@/data/products";
import { localRecommend } from "@/lib/sommelier";
import type { WhatsAppCartItem } from "./cart-link";

export type WhatsAppIntent =
  | "age_gate"
  | "age_confirmed"
  | "age_denied"
  | "recommendation"
  | "order_support"
  | "human_handoff"
  | "opt_out";

export type WhatsAppBotReply = {
  intent: WhatsAppIntent;
  text: string;
  suggestionSlugs: string[];
  checkoutItems?: WhatsAppCartItem[];
  ageVerified?: boolean;
  requiresHuman?: boolean;
  withdrawMarketingConsent?: boolean;
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9+\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasWord(text: string, pattern: RegExp) {
  return pattern.test(normalize(text));
}

function checkoutItemsFor(slugs: readonly string[]): WhatsAppCartItem[] {
  const items: WhatsAppCartItem[] = slugs
    .slice(0, 2)
    .map((slug) => PRODUCTS_BY_SLUG.get(slug))
    .filter((product): product is NonNullable<typeof product> => Boolean(product))
    .map((product) => ({ productId: product.id, quantity: 1 }));
  return items;
}

export function respondToWhatsApp(args: {
  message: string;
  ageVerified: boolean;
}): WhatsAppBotReply {
  const message = args.message.trim().slice(0, 1_500);
  const normalized = normalize(message);

  if (/\b(parar|stop|baja|no promociones|cancelar suscripcion)\b/.test(normalized)) {
    return {
      intent: "opt_out",
      text: "Listo. No volveremos a enviarte promociones por WhatsApp. Aún puedes escribirnos cuando necesites ayuda con un pedido o una recomendación.",
      suggestionSlugs: [],
      withdrawMarketingConsent: true,
    };
  }

  if (!args.ageVerified) {
    if (/\b(no|soy menor|menor de edad|no tengo 18)\b/.test(normalized)) {
      return {
        intent: "age_denied",
        text: "Gracias por escribirnos. WBStraders ofrece bebidas alcohólicas únicamente a personas mayores de 18 años.",
        suggestionSlugs: [],
      };
    }
    if (/\b(si|confirmo|soy mayor|tengo 18|18+)\b/.test(normalized)) {
      return {
        intent: "age_confirmed",
        ageVerified: true,
        text: "Perfecto. ¿Qué te gustaría resolver hoy? Puedes contarme la comida, la ocasión, tu presupuesto, pedir un regalo o consultar un pedido.",
        suggestionSlugs: [],
      };
    }
    return {
      intent: "age_gate",
      text: "Antes de recomendar vinos, confirma por favor que tienes 18 años o más. Responde: “Sí, soy mayor de edad”.",
      suggestionSlugs: [],
    };
  }

  if (/\b(humano|persona|asesor|vendedor|llamar|hablar con alguien|reclamo)\b/.test(normalized)) {
    return {
      intent: "human_handoff",
      text: "Claro. Ya dejé registrada tu solicitud para que un miembro del equipo WBStraders continúe contigo. Mientras tanto, si quieres, cuéntame la ocasión o el vino que buscas.",
      suggestionSlugs: [],
      requiresHuman: true,
    };
  }

  if (/\b(pedido|orden|delivery|entrega|envio|envio|wbs-)\b/.test(normalized)) {
    return {
      intent: "order_support",
      text: "Te ayudo con tu pedido. Envíame tu número de orden (por ejemplo, WBS-2026-000001) y, si prefieres, un miembro del equipo puede revisarlo contigo.",
      suggestionSlugs: [],
      requiresHuman: true,
    };
  }

  const recommendation = localRecommend(message);

  return {
    intent: "recommendation",
    text: `${recommendation.reply}\n\nSi te gusta esta selección, puedo prepararte un enlace de compra seguro.`,
    suggestionSlugs: recommendation.suggestions,
    checkoutItems: checkoutItemsFor(recommendation.suggestions),
  };
}
