import { findZoneByDistrict } from "@/data/delivery-zones";
import { PRODUCTS_BY_ID } from "@/data/products";
import { priceCart } from "@/lib/pricing";
import type { CartLine, Product } from "@/types";

export interface PersistedOrderItem {
  productId: string;
  sku: string;
  productName: string;
  productSnapshot: Record<string, unknown>;
  pricingGroup: string;
  quantity: number;
  regularUnitCents: number;
  appliedUnitCents: number;
  lineTotalCents: number;
  tierMinQty: number;
  tierPackTotalCents: number;
}

export interface CalculatedOrder {
  items: PersistedOrderItem[];
  bottles: number;
  subtotalCents: number;
  deliveryCents: number;
  discountCents: number;
  totalCents: number;
  deliverySnapshot: Record<string, unknown>;
  pricingSnapshot: Record<string, unknown>;
}

export class OrderPricingError extends Error {
  constructor(public readonly code: "UNKNOWN_PRODUCT" | "INVALID_DISTRICT" | "TOO_MANY_BOTTLES", message: string) {
    super(message);
  }
}

function consolidate(items: { productId: string; qty: number }[]): CartLine[] {
  const quantities = new Map<string, number>();
  for (const item of items) quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.qty);

  const lines: CartLine[] = [];
  for (const [productId, qty] of quantities) {
    const product = PRODUCTS_BY_ID.get(productId);
    if (!product) throw new OrderPricingError("UNKNOWN_PRODUCT", `Producto desconocido: ${productId}`);
    lines.push({ product, qty });
  }
  return lines;
}

function snapshotProduct(product: Product): Record<string, unknown> {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    line: product.line,
    type: product.type,
    grapes: product.grapes,
    region: product.region,
    image: product.image ?? null,
  };
}

export function calculateOrder(
  requestedItems: { productId: string; qty: number }[],
  district: string,
): CalculatedOrder {
  const lines = consolidate(requestedItems);
  const pricing = priceCart(lines);
  if (pricing.bottles > 120) {
    throw new OrderPricingError("TOO_MANY_BOTTLES", "La compra web admite hasta 120 botellas");
  }

  const zone = findZoneByDistrict(district);
  if (!zone) throw new OrderPricingError("INVALID_DISTRICT", "El distrito no está dentro de las zonas de reparto");

  const items: PersistedOrderItem[] = [];
  for (const group of pricing.groups) {
    // Allocate the exact group total without losing cents on mixed products.
    let allocated = 0;
    group.lines.forEach((line, index) => {
      const isLast = index === group.lines.length - 1;
      const lineTotal = isLast
        ? group.subtotalCents - allocated
        : Math.floor((group.subtotalCents * line.qty) / group.qty);
      allocated += lineTotal;
      items.push({
        productId: line.product.id,
        sku: line.product.id,
        productName: line.product.name,
        productSnapshot: snapshotProduct(line.product),
        pricingGroup: line.product.pricingGroup,
        quantity: line.qty,
        regularUnitCents: line.product.regularUnitCents,
        appliedUnitCents: Math.round(lineTotal / line.qty),
        lineTotalCents: lineTotal,
        tierMinQty: group.tier.minQty,
        tierPackTotalCents: group.tier.packTotalCents,
      });
    });
  }

  const deliveryCents = pricing.subtotalCents >= zone.freeFromCents ? 0 : zone.costCents;
  return {
    items,
    bottles: pricing.bottles,
    subtotalCents: pricing.subtotalCents,
    deliveryCents,
    discountCents: 0,
    totalCents: pricing.subtotalCents + deliveryCents,
    deliverySnapshot: {
      zoneId: zone.id,
      zoneName: zone.name,
      district,
      costCents: deliveryCents,
      freeFromCents: zone.freeFromCents,
      eta: zone.eta,
    },
    pricingSnapshot: {
      catalogVersion: "fiestas-patrias-2026",
      calculatedAt: new Date().toISOString(),
      regularCents: pricing.regularCents,
      savingsCents: pricing.savingsCents,
      groups: pricing.groups.map((group) => ({
        groupId: group.groupId,
        quantity: group.qty,
        tierMinQty: group.tier.minQty,
        tierPackTotalCents: group.tier.packTotalCents,
        subtotalCents: group.subtotalCents,
      })),
    },
  };
}
