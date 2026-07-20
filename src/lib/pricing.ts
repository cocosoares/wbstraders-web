import type { CartLine, PriceTier, Product } from "@/types";

/**
 * Motor de precios por escalas de WBStraders.
 *
 * Regla de negocio: los productos "y/o" del catálogo (misma línea) comparten
 * `pricingGroup`; sus cantidades se SUMAN para alcanzar la escala de descuento.
 * Ej.: 2 Bonarda + 2 Malvasía + 2 Sangiovese Rosé = 6 botellas → precio x6.
 */

/** Escala aplicable para una cantidad dada (la mayor cuyo mínimo se alcanza). */
export function tierForQty(tiers: PriceTier[], qty: number): PriceTier {
  let current = tiers[0];
  for (const tier of tiers) {
    if (qty >= tier.minQty) current = tier;
  }
  return current;
}

/** Siguiente escala por desbloquear, o null si ya está en la máxima. */
export function nextTier(tiers: PriceTier[], qty: number): PriceTier | null {
  return tiers.find((t) => t.minQty > qty) ?? null;
}

/** Precio unitario (céntimos, redondeado) de una escala. */
export function tierUnitCents(tier: PriceTier): number {
  return Math.round(tier.packTotalCents / tier.minQty);
}

/**
 * Total exacto para `qty` botellas bajo una escala. En múltiplos exactos del
 * pack devuelve el precio de catálogo sin errores de redondeo.
 */
export function lineTotalCents(tier: PriceTier, qty: number): number {
  return Math.round((tier.packTotalCents * qty) / tier.minQty);
}

/**
 * Compone una cantidad usando únicamente packs publicados. Las botellas que
 * exceden un pack no heredan por prorrateo un descuento que el catálogo no
 * definió (ej.: x3 + x1 para cuatro botellas).
 */
export function discreteTotalCents(tiers: PriceTier[], qty: number): number {
  let remaining = Math.max(0, Math.floor(qty));
  let total = 0;
  for (const tier of [...tiers].sort((a, b) => b.minQty - a.minQty)) {
    const packs = Math.floor(remaining / tier.minQty);
    if (packs === 0) continue;
    total += packs * tier.packTotalCents;
    remaining -= packs * tier.minQty;
  }
  return total;
}

/** Menor precio unitario alcanzable de un producto (para "Desde S/ ..."). */
export function bestUnitCents(product: Product): number {
  return Math.min(...product.tiers.map(tierUnitCents));
}

export interface GroupPricing {
  groupId: string;
  lineName: string;
  lines: CartLine[];
  qty: number;
  tier: PriceTier;
  unitCents: number;
  subtotalCents: number;
  regularCents: number;
  savingsCents: number;
  next: { tier: PriceTier; missing: number; unitCents: number } | null;
}

export interface CartPricing {
  groups: GroupPricing[];
  bottles: number;
  subtotalCents: number;
  regularCents: number;
  savingsCents: number;
}

function priceGroup(groupId: string, lines: CartLine[]): GroupPricing {
  const qty = lines.reduce((acc, l) => acc + l.qty, 0);
  const tiers = lines[0].product.tiers;
  const tier = tierForQty(tiers, qty);
  const subtotalCents = discreteTotalCents(tiers, qty);
  // La referencia de ahorro es el precio x1 realmente disponible en el sitio,
  // no un PVP teórico que el cliente podría no haber visto ni pagado.
  const singleUnitCents = tierUnitCents(tiers[0]);
  const regularCents = singleUnitCents * qty;
  const upcoming = nextTier(tiers, qty);

  return {
    groupId,
    lineName: lines[0].product.line,
    lines,
    qty,
    tier,
    unitCents: qty > 0 ? Math.round(subtotalCents / qty) : 0,
    subtotalCents,
    regularCents,
    savingsCents: Math.max(0, regularCents - subtotalCents),
    next: upcoming
      ? {
          tier: upcoming,
          missing: upcoming.minQty - qty,
          unitCents: tierUnitCents(upcoming),
        }
      : null,
  };
}

/** Calcula el precio total del carrito agrupando por escala compartida. */
export function priceCart(lines: CartLine[]): CartPricing {
  const byGroup = new Map<string, CartLine[]>();
  for (const line of lines) {
    if (line.qty <= 0) continue;
    const key = line.product.pricingGroup;
    const bucket = byGroup.get(key);
    if (bucket) bucket.push(line);
    else byGroup.set(key, [line]);
  }

  const groups = [...byGroup.entries()].map(([id, ls]) => priceGroup(id, ls));
  const subtotalCents = groups.reduce((acc, g) => acc + g.subtotalCents, 0);
  const regularCents = groups.reduce((acc, g) => acc + g.regularCents, 0);

  return {
    groups,
    bottles: groups.reduce((acc, g) => acc + g.qty, 0),
    subtotalCents,
    regularCents,
    savingsCents: Math.max(0, regularCents - subtotalCents),
  };
}
