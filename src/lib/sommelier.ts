import { PRODUCTS } from "@/data/products";
import { tierUnitCents } from "@/lib/pricing";
import { formatPEN } from "@/lib/utils";

export interface SommelierResponse {
  reply: string;
  suggestions: string[];
}

/** Resumen del catálogo que se inyecta como contexto del modelo. */
export function buildCatalogContext(): string {
  return PRODUCTS.map((p) => {
    const tiers = p.tiers
      .map(
        (t) =>
          `x${t.minQty} ${formatPEN(t.packTotalCents)} (${formatPEN(tierUnitCents(t))} c/u)`,
      )
      .join(", ");
    return `- slug: ${p.slug} | ${p.name} | ${p.brand} | ${p.type} (${p.grapes.join(", ")}) | ${p.region} | Marida: ${p.pairings.join(", ")} | Nota: ${p.tastingNotes} | Precios: ${tiers} | Regular: ${formatPEN(p.regularUnitCents)}`;
  }).join("\n");
}

export const SOMMELIER_SYSTEM_PROMPT = `Eres "El Sommelier de WBStraders", asesor virtual de una importadora boutique peruana de vinos de autor argentinos con delivery en Lima. Tu tono es elegante, cálido y cercano, con un toque limeño refinado. Respondes SIEMPRE en español. Eres un vendedor consultivo experto: tu objetivo es ayudar genuinamente Y maximizar el valor de cada pedido, sin sonar nunca insistente ni artificial.

Reglas de recomendación:
1. Recomienda exclusivamente vinos del catálogo listado abajo (usa sus slugs exactos).
2. Sé breve: máximo 100 palabras por respuesta. Si falta contexto (ocasión, plato, cuántas personas, presupuesto), haz UNA pregunta concreta antes de recomendar — vender bien empieza por escuchar.
3. Asocia platos peruanos de inmediato: ceviche/tiradito → Torrontés o Sauvignon Blanc; parrilla/lomo → RN40 o Malbec; pastas/pizza → Bonarda; celebración → Brut Nature; regalo especial → Geografía Extraordinaria.

Técnicas de venta a aplicar SIEMPRE que sea natural (nunca fuerces las tres a la vez; elige la más relevante al momento de la conversación):
4. UPSELL por volumen: cuando recomiendes un vino, menciona el precio del pack más grande y cuánto ahorra vs. comprar suelto (ej. "en pack x6 baja a S/ X la botella, ahorras S/ Y"). Ancla siempre el precio regular contra el precio oferta.
5. CROSS-SELL inteligente: sugiere un complemento con lógica real, no al azar — un espumante para abrir la noche, una segunda etiqueta para acompañar otro plato del mismo almuerzo, o copas/quesos si el contexto lo pide.
6. MIX & MATCH: si el vino recomendado pertenece a una línea con "y/o" (cepas que comparten precio), dile explícitamente que puede combinar 2-3 etiquetas de esa línea y llegar igual al precio de pack — esto baja la barrera de "comprar 6 iguales".
7. CIERRE ACCIONABLE: termina casi siempre invitando a agregar al carrito o preguntando cuántas botellas necesita — no dejes la conversación abierta sin un siguiente paso claro.
8. Si el cliente indica presupuesto ajustado, no lo empujes a gastar más — recomienda la línea Casa (mejor precio/botella) y gánate su confianza; la venta grande viene después.
9. Si preguntan algo ajeno a vinos o al servicio, redirige con cortesía a la selección de vinos.

Formato de salida:
10. Responde ÚNICAMENTE con JSON válido, sin markdown ni texto extra, con esta forma exacta:
{"reply": "tu respuesta", "suggestions": ["slug-1", "slug-2"]}
Incluye de 1 a 3 slugs relevantes en "suggestions" (el principal primero, luego el cross-sell/upsell si aplica).

Catálogo:
${buildCatalogContext()}`;

function normalize(text: string): string {
  // Elimina tildes/diacriticos para comparar sin acentos
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const RULES: { pattern: RegExp; reply: string; suggestions: string[] }[] = [
  {
    pattern: /cevich|tiradito|pescad|marisc|sushi|nikkei|concha/,
    reply:
      "Para pescados y mariscos con limón necesitas frescura y aromas: nuestro 1700 msnm Torrontés de Cafayate es el compañero clásico del ceviche, y el Casa Sauvignon Blanc es la opción fresca de mejor precio. En pack x2 o x4 el ahorro es notable.",
    suggestions: ["1700-msnm-torrontes", "casa-sauvignon-blanc"],
  },
  {
    pattern: /asado|parrilla|carne|lomo|anticuch|cordero|bife|costilla|churrasco/,
    reply:
      "Para carnes a la parrilla te recomiendo estructura y taninos firmes: el RN40 Malbec es nuestro ícono para el asado del domingo, y el Livverá Malbec aporta fruta fresca de Gualtallary. Llevando 6 botellas (puedes combinar cepas de la misma línea) desbloqueas el precio mayorista.",
    suggestions: ["rn40-malbec", "livvera-malbec", "1700-msnm-malbec"],
  },
  {
    pattern: /pasta|pizza|lasagn|lasana|tallarin|boloñesa|bolonesa/,
    reply:
      "Con pastas y salsas rojas brilla la Bonarda: ligera, frutal y muy versátil. El Livverá Bonarda es perfecto, y el Casa Malbec es una gran alternativa de precio. Recuerda que puedes mezclar cepas de la línea Livverá y mantener el descuento por volumen.",
    suggestions: ["livvera-bonarda", "casa-malbec"],
  },
  {
    pattern: /pollo a la brasa|pollo|brasa/,
    reply:
      "El pollo a la brasa pide un tinto frutal de cuerpo medio: el Casa Malbec es nuestro favorito calidad-precio, y el Livverá Bonarda le va espectacular. En pack x4 o x6 el precio por botella baja bastante.",
    suggestions: ["casa-malbec", "livvera-bonarda"],
  },
  {
    pattern: /celebra|brindis|cumplean|aniversario|espumante|champan|champagne|boda/,
    reply:
      "Para brindar, nuestro Finca Ambrosía Brut Nature: método tradicional, burbuja fina y cero azúcar añadida. En pack x4 queda a mitad de precio por botella — ideal para que la celebración no se quede corta.",
    suggestions: ["finca-ambrosia-brut-nature"],
  },
  {
    pattern: /regal|sorprend|detalle|impresionar/,
    reply:
      "Para un regalo memorable, la línea Geografía Extraordinaria (93–95 pts. de la crítica) es nuestra joya: hay blend de tintas y de blancas del Valle de Uco. Y si buscas algo festivo, el Brut Nature siempre queda impecable.",
    suggestions: [
      "geografia-extraordinaria-tintas-de-uco",
      "geografia-extraordinaria-blancas-de-uco",
      "finca-ambrosia-brut-nature",
    ],
  },
  {
    pattern: /picante|aji de gallina|aji|chifa|arroz chaufa|rocoto/,
    reply:
      "Con platos con ají o chifa, un blanco aromático equilibra el picante: el 1700 msnm Torrontés es la elección de los sommeliers, y la Livverá Malvasía es una rareza deliciosa que sorprende.",
    suggestions: ["1700-msnm-torrontes", "livvera-malvasia"],
  },
  {
    pattern: /rosado|rose|terraza|verano|tarde|piqueo/,
    reply:
      "Para una tarde de terraza o piqueos, el Livverá Sangiovese Rosé: seco, fresco y elegante. Combínalo con Bonarda y Malvasía de la misma línea y el pack x6 queda a precio de bodega.",
    suggestions: ["livvera-sangiovese-rose", "livvera-malvasia"],
  },
  {
    pattern: /barat|economic|precio|oferta|presupuesto/,
    reply:
      "La mejor relación calidad-precio de la cava es la línea Casa de Finca Ambrosía: Sauvignon Blanc y Malbec desde S/ 33.33 por botella en pack x12 (y puedes combinar ambos). Calidad de restaurante a precio de importador.",
    suggestions: ["casa-sauvignon-blanc", "casa-malbec"],
  },
];

/** Recomendador local por reglas (fallback cuando no hay API key o falla la API). */
export function localRecommend(userText: string): SommelierResponse {
  const text = normalize(userText);
  for (const rule of RULES) {
    if (rule.pattern.test(text)) {
      return { reply: rule.reply, suggestions: rule.suggestions };
    }
  }
  return {
    reply:
      "¡Hola! Soy el sommelier de WBStraders. Cuéntame: ¿para qué ocasión buscas vino? ¿Un almuerzo con ceviche, una parrilla, una celebración o un regalo? Con eso te recomiendo la botella perfecta de nuestra cava y el pack con mejor ahorro.",
    suggestions: ["rn40-malbec", "1700-msnm-torrontes", "finca-ambrosia-brut-nature"],
  };
}

/** Valida y extrae la respuesta JSON del modelo; si falla, degrada con elegancia. */
export function parseModelResponse(raw: string): SommelierResponse {
  const validSlugs = new Set(PRODUCTS.map((p) => p.slug));
  try {
    const cleaned = raw.replace(/```(?:json)?/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as {
      reply?: unknown;
      suggestions?: unknown;
    };
    const reply =
      typeof parsed.reply === "string" && parsed.reply.trim().length > 0
        ? parsed.reply.trim()
        : raw.trim();
    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions
          .filter((s): s is string => typeof s === "string")
          .filter((s) => validSlugs.has(s))
          .slice(0, 3)
      : [];
    return { reply, suggestions };
  } catch {
    return { reply: raw.trim(), suggestions: [] };
  }
}
