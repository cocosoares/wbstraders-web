export type WineType = "Tinto" | "Blanco" | "Rosado" | "Espumante";

export type Brand = "Escala Humana" | "Finca Ambrosía" | "Viñas en Flor";

export type ProductVisualTone =
  | "garnet"
  | "terracotta"
  | "plum"
  | "celadon"
  | "blush"
  | "champagne"
  | "teal"
  | "slate"
  | "ochre"
  | "lavender"
  | "mineral"
  | "copper"
  | "indigo"
  | "sky";

/**
 * Escala de precio por volumen. `packTotalCents` es el precio exacto del pack
 * de `minQty` botellas (tal como figura en el catálogo oficial).
 */
export interface PriceTier {
  minQty: number;
  packTotalCents: number;
  label?: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: Brand;
  line: string;
  type: WineType;
  grapes: string[];
  region: string;
  altitude?: string;
  description: string;
  tastingNotes: string;
  pairings: string[];
  ratings?: string;
  badge?: string;
  regularUnitCents: number;
  /**
   * Productos "y/o" del catálogo comparten grupo de precios: las cantidades
   * se suman entre cepas de la misma línea para alcanzar la escala.
   */
  pricingGroup: string;
  tiers: PriceTier[];
  /** Foto real opcional (p. ej. /products/rn40-malbec.jpg). Si falta, se usa la ilustración. */
  image?: string;
  /** Dirección de arte del fondo para mantener contraste con la botella y su etiqueta. */
  visualTone?: ProductVisualTone;
}

export interface CartLine {
  product: Product;
  qty: number;
}

export interface DeliveryZone {
  id: string;
  name: string;
  districts: string[];
  costCents: number;
  freeFromCents: number;
  eta: string;
}
