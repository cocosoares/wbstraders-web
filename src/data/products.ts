import type { PriceTier, Product } from "@/types";
import { toCents } from "@/lib/utils";

/**
 * Catálogo oficial WBStraders (precios del catálogo "Fiestas Patrias 2026").
 * Los precios de pack son EXACTOS en céntimos; el motor de precios calcula
 * el unitario. Los productos "y/o" comparten `pricingGroup` (mix & match).
 */

function t(minQty: number, packSoles: number, label?: string): PriceTier {
  return { minQty, packTotalCents: toCents(packSoles), label };
}

export const PRODUCTS: Product[] = [
  // ── Escala Humana · Livverá (tintas clásicas) ─────────────────────────────
  {
    id: "livvera-malbec",
    slug: "livvera-malbec",
    name: "Livverá Malbec",
    brand: "Escala Humana",
    line: "Livverá",
    type: "Tinto",
    grapes: ["Malbec"],
    region: "Gualtallary, Valle de Uco · Mendoza",
    altitude: "1,400 msnm",
    description:
      "El Malbec de mínima intervención de Germán Masera: fruta roja vibrante, frescura de altura y un final jugoso que pide otra copa. Un vino honesto que muestra el suelo calcáreo de Gualtallary.",
    tastingNotes:
      "Ciruela fresca y guinda, violetas, taninos suaves y acidez vibrante. Sin exceso de madera: pura fruta y terroir.",
    pairings: ["Lomo saltado", "Parrilla criolla", "Quesos maduros"],
    badge: "Más vendido",
    regularUnitCents: toCents(134.9),
    pricingGroup: "livvera-tintas",
    image: "/products/livvera-malbec.webp",
    visualTone: "garnet",
    tiers: [
      t(1, 86.64, "Precio oferta"),
      t(3, 231.9, "Pack x3"),
      t(6, 372.9, "Mejor precio x6"),
    ],
  },
  {
    id: "livvera-cabernet",
    slug: "livvera-cabernet-sauvignon",
    name: "Livverá Cabernet Sauvignon",
    brand: "Escala Humana",
    line: "Livverá",
    type: "Tinto",
    grapes: ["Cabernet Sauvignon"],
    region: "Gualtallary, Valle de Uco · Mendoza",
    altitude: "1,400 msnm",
    description:
      "Un Cabernet de altura, fresco y especiado, lejos del estilo pesado tradicional. Estructura elegante con la identidad de mínima intervención de Escala Humana.",
    tastingNotes:
      "Cassis, pimiento asado y hierbas de montaña. Taninos firmes pero pulidos, final largo y fresco.",
    pairings: ["Asado de tira", "Anticuchos", "Carnes rojas"],
    regularUnitCents: toCents(134.9),
    pricingGroup: "livvera-tintas",
    image: "/products/livvera-cabernet-sauvignon.webp",
    visualTone: "terracotta",
    tiers: [
      t(1, 86.64, "Precio oferta"),
      t(3, 231.9, "Pack x3"),
      t(6, 372.9, "Mejor precio x6"),
    ],
  },

  // ── Escala Humana · Livverá (mix Bonarda / Malvasía / Rosé) ───────────────
  {
    id: "livvera-bonarda",
    slug: "livvera-bonarda",
    name: "Livverá Bonarda",
    brand: "Escala Humana",
    line: "Livverá Mix",
    type: "Tinto",
    grapes: ["Bonarda"],
    region: "Gualtallary, Valle de Uco · Mendoza",
    description:
      "La uva insignia rescatada por los enólogos jóvenes argentinos: ligera, frutal y peligrosamente fácil de tomar. Ideal ligeramente fresca.",
    tastingNotes:
      "Cereza negra, moras y un toque floral. Cuerpo ligero, taninos amables, final frutal.",
    pairings: ["Pizza", "Pastas en salsa roja", "Piqueos criollos"],
    regularUnitCents: toCents(134.9),
    pricingGroup: "livvera-mix",
    image: "/products/livvera-bonarda.webp",
    visualTone: "plum",
    tiers: [
      t(1, 86.9, "Precio oferta"),
      t(3, 231.9, "Pack x3"),
      t(6, 399.9, "Mejor precio x6"),
    ],
  },
  {
    id: "livvera-malvasia",
    slug: "livvera-malvasia",
    name: "Livverá Malvasía",
    brand: "Escala Humana",
    line: "Livverá Mix",
    type: "Blanco",
    grapes: ["Malvasía"],
    region: "Gualtallary, Valle de Uco · Mendoza",
    description:
      "Una rareza deliciosa: Malvasía de altura, aromática y salina. El blanco favorito de los sommeliers para la mesa peruana.",
    tastingNotes:
      "Flores blancas, durazno y piel de naranja. Boca fresca con final salino y persistente.",
    pairings: ["Tiradito", "Causa limeña", "Comida nikkei"],
    regularUnitCents: toCents(134.9),
    pricingGroup: "livvera-mix",
    image: "/products/livvera-malvasia.webp",
    visualTone: "celadon",
    tiers: [
      t(1, 86.9, "Precio oferta"),
      t(3, 231.9, "Pack x3"),
      t(6, 399.9, "Mejor precio x6"),
    ],
  },
  {
    id: "livvera-sangiovese-rose",
    slug: "livvera-sangiovese-rose",
    name: "Livverá Sangiovese Rosé",
    brand: "Escala Humana",
    line: "Livverá Mix",
    type: "Rosado",
    grapes: ["Sangiovese"],
    region: "Gualtallary, Valle de Uco · Mendoza",
    description:
      "Rosado seco y gastronómico de Sangiovese. Fresco, delicado y versátil: de la terraza al almuerzo de domingo.",
    tastingNotes:
      "Fresas silvestres, pomelo rosado y pétalos. Seco, tenso y refrescante.",
    pairings: ["Piqueos", "Poke y nikkei", "Tarde de terraza"],
    regularUnitCents: toCents(134.9),
    pricingGroup: "livvera-mix",
    image: "/products/livvera-sangiovese-rose.webp",
    visualTone: "blush",
    tiers: [
      t(1, 86.9, "Precio oferta"),
      t(3, 231.9, "Pack x3"),
      t(6, 399.9, "Mejor precio x6"),
    ],
  },

  // ── Finca Ambrosía ────────────────────────────────────────────────────────
  {
    id: "ambrosia-brut-nature",
    slug: "finca-ambrosia-brut-nature",
    name: "Finca Ambrosía Brut Nature",
    brand: "Finca Ambrosía",
    line: "Brut Nature",
    type: "Espumante",
    grapes: ["Chardonnay"],
    region: "Gualtallary, Valle de Uco · Mendoza",
    altitude: "1,400 msnm",
    description:
      "Espumante Blanc de Blancs de método tradicional, sin azúcar añadida. Burbuja fina y elegante para celebrar como en los mejores restaurantes.",
    tastingNotes:
      "Manzana verde, brioche y cítricos. Burbuja cremosa, final seco y mineral.",
    pairings: ["Celebraciones", "Ostras y mariscos", "Sushi"],
    badge: "Para celebrar",
    regularUnitCents: toCents(114.9),
    pricingGroup: "ambrosia-brut",
    image: "/products/finca-ambrosia-brut-nature.webp",
    visualTone: "champagne",
    tiers: [
      t(1, 114.9),
      t(2, 147.9, "Precio oferta x2"),
      t(4, 204.9, "Mejor precio x4"),
    ],
  },
  {
    id: "casa-sauvignon-blanc",
    slug: "casa-sauvignon-blanc",
    name: "Casa Sauvignon Blanc",
    brand: "Finca Ambrosía",
    line: "Casa",
    type: "Blanco",
    grapes: ["Sauvignon Blanc"],
    region: "Gualtallary, Valle de Uco · Mendoza",
    description:
      "El blanco diario perfecto: fresco, cítrico y directo. La puerta de entrada a Finca Ambrosía al mejor precio del catálogo.",
    tastingNotes:
      "Maracuyá, limón y hierba fresca. Ligero, chispeante y muy fácil de tomar.",
    pairings: ["Ceviche", "Conchas a la parmesana", "Ensaladas frescas"],
    regularUnitCents: toCents(69.9),
    pricingGroup: "ambrosia-casa",
    image: "/products/casa-sauvignon-blanc.webp",
    visualTone: "teal",
    tiers: [
      t(1, 69.9),
      t(2, 89.9, "Precio oferta x2"),
      t(4, 173.9, "Pack x4"),
      t(6, 231.9, "Pack x6"),
      t(12, 399.9, "Mejor precio x12"),
    ],
  },
  {
    id: "casa-malbec",
    slug: "casa-malbec",
    name: "Casa Malbec",
    brand: "Finca Ambrosía",
    line: "Casa",
    type: "Tinto",
    grapes: ["Malbec"],
    region: "Gualtallary, Valle de Uco · Mendoza",
    description:
      "Malbec joven y frutal de Finca Ambrosía, pensado para la mesa de todos los días sin sacrificar origen ni calidad.",
    tastingNotes:
      "Ciruela madura, mora y vainilla suave. Cuerpo medio, taninos redondos.",
    pairings: ["Pollo a la brasa", "Hamburguesas", "Pastas"],
    regularUnitCents: toCents(69.9),
    pricingGroup: "ambrosia-casa",
    image: "/products/casa-malbec.webp",
    visualTone: "slate",
    tiers: [
      t(1, 69.9),
      t(2, 89.9, "Precio oferta x2"),
      t(4, 173.9, "Pack x4"),
      t(6, 231.9, "Pack x6"),
      t(12, 399.9, "Mejor precio x12"),
    ],
  },
  {
    id: "geografia-blancas",
    slug: "geografia-extraordinaria-blancas-de-uco",
    name: "Geografía Extraordinaria · Blancas de Uco",
    brand: "Escala Humana",
    line: "Geografía Extraordinaria",
    type: "Blanco",
    grapes: ["Blend de blancas"],
    region: "Gualtallary, Valle de Uco · Mendoza",
    description:
      "Blend de parcelas extraordinarias entre los ríos Tunuyán y Las Tunas. La expresión más alta de Escala Humana, premiada por la crítica internacional: perfecto para regalar.",
    tastingNotes:
      "Cítricos confitados, piedra mojada y flores. Textura sedosa, tensión mineral y final largísimo.",
    pairings: ["Pescados finos", "Cena de autor", "Regalo especial"],
    ratings: "93–95 pts. en Vinous, Tim Atkin MW y Robert Parker (Wine Advocate)",
    badge: "93–95 pts.",
    regularUnitCents: toCents(208.9),
    pricingGroup: "geografia",
    image: "/products/geografia-extraordinaria-blancas-de-uco.webp",
    visualTone: "ochre",
    tiers: [
      t(1, 134.9, "Precio oferta"),
      t(2, 240.9, "Pack x2"),
      t(3, 312.9, "Mejor precio x3"),
    ],
  },
  {
    id: "geografia-tintas",
    slug: "geografia-extraordinaria-tintas-de-uco",
    name: "Geografía Extraordinaria · Tintas de Uco",
    brand: "Escala Humana",
    line: "Geografía Extraordinaria",
    type: "Tinto",
    grapes: ["Blend de tintas"],
    region: "Gualtallary, Valle de Uco · Mendoza",
    description:
      "Blend de parcelas extraordinarias entre los ríos Tunuyán y Las Tunas. La expresión más alta de Escala Humana: profundo, complejo y memorable.",
    tastingNotes:
      "Fruta negra profunda, grafito y especias dulces. Taninos aterciopelados y una capa infinita de matices.",
    pairings: ["Carnes maduradas", "Cena de autor", "Regalo especial"],
    ratings: "93–95 pts. en Vinous, Tim Atkin MW y Robert Parker (Wine Advocate)",
    badge: "93–95 pts.",
    regularUnitCents: toCents(208.9),
    pricingGroup: "geografia",
    image: "/products/geografia-extraordinaria-tintas-de-uco.webp",
    visualTone: "lavender",
    tiers: [
      t(1, 134.9, "Precio oferta"),
      t(2, 240.9, "Pack x2"),
      t(3, 312.9, "Mejor precio x3"),
    ],
  },

  // ── Viñas en Flor (Cafayate, Salta) ───────────────────────────────────────
  {
    id: "1700-torrontes",
    slug: "1700-msnm-torrontes",
    name: "1700 msnm Torrontés",
    brand: "Viñas en Flor",
    line: "1700 msnm",
    type: "Blanco",
    grapes: ["Torrontés"],
    region: "Valle de Cafayate · Salta",
    altitude: "1,700 msnm",
    description:
      "Torrontés de viñedo único a 1,700 metros de altura en Cafayate. Aromático, fresco y el compañero perfecto del ceviche peruano.",
    tastingNotes:
      "Jazmín, cáscara de lima y durazno blanco. Boca seca y vibrante, con la acidez perfecta para el limón peruano.",
    pairings: ["Ceviche", "Ají de gallina", "Comida chifa"],
    badge: "Ideal con ceviche",
    regularUnitCents: toCents(98.9),
    pricingGroup: "1700-torrontes",
    image: "/products/1700-msnm-torrontes-cutout.webp",
    visualTone: "mineral",
    tiers: [
      t(1, 98.9),
      t(2, 131.9, "Precio oferta x2"),
      t(4, 254.9, "Pack x4"),
      t(6, 339.9, "Pack x6"),
      t(12, 539.9, "Mejor precio x12"),
    ],
  },
  {
    id: "1700-malbec",
    slug: "1700-msnm-malbec",
    name: "1700 msnm Malbec",
    brand: "Viñas en Flor",
    line: "1700 msnm Tintas",
    type: "Tinto",
    grapes: ["Malbec"],
    region: "Valle de Cafayate · Salta",
    altitude: "1,700 msnm",
    description:
      "Malbec de viñedo único en la altura extrema de Cafayate: fruta intensa, especias y una frescura que solo da la montaña.",
    tastingNotes:
      "Mora, pimienta negra y violetas. Estructura media-alta con final especiado y fresco.",
    pairings: ["Lomo al jugo", "Costillas BBQ", "Risotto de hongos"],
    regularUnitCents: toCents(98.9),
    pricingGroup: "1700-tintas",
    image: "/products/1700-msnm-malbec-cutout.webp",
    visualTone: "copper",
    tiers: [
      t(1, 98.9),
      t(2, 131.9, "Precio oferta x2"),
      t(4, 254.9, "Pack x4"),
      t(6, 339.9, "Pack x6"),
      t(12, 588.0, "Mejor precio x12"),
    ],
  },
  {
    id: "1700-cabernet",
    slug: "1700-msnm-cabernet-sauvignon",
    name: "1700 msnm Cabernet Sauvignon",
    brand: "Viñas en Flor",
    line: "1700 msnm Tintas",
    type: "Tinto",
    grapes: ["Cabernet Sauvignon"],
    region: "Valle de Cafayate · Salta",
    altitude: "1,700 msnm",
    description:
      "Cabernet de altura con carácter salteño: potencia controlada, especias y elegancia para acompañar carnes con personalidad.",
    tastingNotes:
      "Cassis, eucalipto y tabaco dulce. Taninos firmes, final largo y especiado.",
    pairings: ["Bife angosto", "Estofados", "Quesos intensos"],
    regularUnitCents: toCents(98.9),
    pricingGroup: "1700-tintas",
    image: "/products/1700-msnm-cabernet-sauvignon-cutout.webp",
    visualTone: "indigo",
    tiers: [
      t(1, 98.9),
      t(2, 131.9, "Precio oferta x2"),
      t(4, 254.9, "Pack x4"),
      t(6, 339.9, "Pack x6"),
      t(12, 588.0, "Mejor precio x12"),
    ],
  },
  {
    id: "rn40-malbec",
    slug: "rn40-malbec",
    name: "RN40 Malbec",
    brand: "Viñas en Flor",
    line: "RN40",
    type: "Tinto",
    grapes: ["Malbec"],
    region: "Valle de Cafayate · Salta",
    altitude: "1,700 msnm",
    description:
      "Homenaje a la mítica Ruta Nacional 40. Un Malbec de Cafayate complejo y profundo, el tinto ícono para la parrilla del domingo.",
    tastingNotes:
      "Fruta negra madura, chocolate amargo y especias. Cuerpo pleno, taninos dulces y final persistente.",
    pairings: ["Asado y parrilla", "Cordero", "Quesos curados"],
    badge: "Ícono de la casa",
    regularUnitCents: toCents(83.9),
    pricingGroup: "rn40",
    image: "/products/rn40-malbec-cutout.webp",
    visualTone: "sky",
    tiers: [
      t(1, 83.9),
      t(2, 111.9, "Precio oferta x2"),
      t(4, 215.9, "Pack x4"),
      t(6, 288.9, "Pack x6"),
      t(12, 456.9, "Mejor precio x12"),
    ],
  },
];

export const PRODUCTS_BY_ID = new Map(PRODUCTS.map((p) => [p.id, p]));
export const PRODUCTS_BY_SLUG = new Map(PRODUCTS.map((p) => [p.slug, p]));

export function productsInGroup(groupId: string): Product[] {
  return PRODUCTS.filter((p) => p.pricingGroup === groupId);
}

export function groupSiblings(product: Product): Product[] {
  return productsInGroup(product.pricingGroup).filter(
    (p) => p.id !== product.id,
  );
}

export const BRANDS = [
  {
    name: "Escala Humana" as const,
    origin: "Gualtallary, Valle de Uco · Mendoza",
    blurb:
      "Los vinos de mínima intervención de Germán Masera. Frescura, fruta y suelos calcáreos de altura en su máxima expresión.",
  },
  {
    name: "Finca Ambrosía" as const,
    origin: "Gualtallary, Valle de Uco · Mendoza",
    blurb:
      "Vinos de terroir premiados por la crítica internacional, del espumante Brut Nature a los blends de colección.",
  },
  {
    name: "Viñas en Flor" as const,
    origin: "Valle de Cafayate · Salta",
    blurb:
      "Viñedos extremos a 1,700 msnm: Torrontés aromático y tintos de altura con carácter salteño.",
  },
];
