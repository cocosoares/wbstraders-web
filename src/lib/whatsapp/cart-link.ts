import { PRODUCTS_BY_ID } from "@/data/products";

const MAX_PRODUCTS = 8;
const MAX_QUANTITY_PER_PRODUCT = 24;

export type WhatsAppCartItem = {
  productId: string;
  quantity: number;
};

function normalizeItems(items: readonly WhatsAppCartItem[]): WhatsAppCartItem[] {
  const quantities = new Map<string, number>();

  for (const item of items) {
    if (!PRODUCTS_BY_ID.has(item.productId)) continue;
    if (!Number.isInteger(item.quantity) || item.quantity < 1) continue;

    const nextQuantity = Math.min(
      MAX_QUANTITY_PER_PRODUCT,
      (quantities.get(item.productId) ?? 0) + item.quantity,
    );
    quantities.set(item.productId, nextQuantity);
  }

  return Array.from(quantities, ([productId, quantity]) => ({ productId, quantity })).slice(
    0,
    MAX_PRODUCTS,
  );
}

/**
 * Serializes only catalog IDs and quantities. Prices are always recalculated in
 * checkout, so a WhatsApp link cannot alter commercial conditions.
 */
export function encodeWhatsAppCart(items: readonly WhatsAppCartItem[]): string | null {
  const normalized = normalizeItems(items);
  if (normalized.length === 0) return null;
  return normalized.map((item) => `${item.productId}:${item.quantity}`).join(",");
}

export function decodeWhatsAppCart(value: string | null | undefined): Record<string, number> {
  if (!value || value.length > 1_000) return {};

  const entries = value.split(",").map((part) => {
    const [productId, quantity] = part.split(":", 2);
    return {
      productId: productId ?? "",
      quantity: Number.parseInt(quantity ?? "", 10),
    };
  });

  return Object.fromEntries(
    normalizeItems(entries).map(({ productId, quantity }) => [productId, quantity]),
  );
}

export function createWhatsAppCheckoutUrl(args: {
  baseUrl: string;
  items: readonly WhatsAppCartItem[];
  campaign?: string;
}): string | null {
  const cart = encodeWhatsAppCart(args.items);
  if (!cart) return null;

  let url: URL;
  try {
    url = new URL("/checkout", args.baseUrl);
  } catch {
    return null;
  }

  url.searchParams.set("wbs_cart", cart);
  url.searchParams.set("utm_source", "whatsapp");
  url.searchParams.set("utm_medium", "conversation");
  url.searchParams.set("utm_campaign", args.campaign?.slice(0, 80) || "sommelier");
  url.searchParams.set("utm_content", "recommendation");
  return url.toString();
}

/** Builds a checkout URL from an opaque, server-created WhatsApp session. */
export function createWhatsAppCheckoutSessionUrl(args: {
  baseUrl: string;
  token: string;
}): string | null {
  if (!/^[a-f0-9]{64}$/.test(args.token)) return null;
  try {
    const url = new URL(`/w/${args.token}`, args.baseUrl);
    return url.toString();
  } catch {
    return null;
  }
}
