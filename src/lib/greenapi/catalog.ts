import type { SupabaseClient } from "@supabase/supabase-js";
import { PRODUCTS } from "@/data/products";
import { getGreenApiConfig, greenApiChatId, type GreenApiConfig } from "@/lib/greenapi/client";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Product } from "@/types";

const PROVIDER_TIMEOUT_MS = 12_000;
const REQUEST_SPACING_MS = 750;

export type GreenApiCatalogMode = "dry-run" | "sync";

export type GreenApiCatalogProduct = {
  id: string;
  retailer_id?: string | null;
  is_hidden?: boolean | null;
  name?: string | null;
  description?: string | null;
  price?: string | null;
  currency?: string | null;
  url?: string | null;
  media?: {
    images?: Array<{ original_image_url?: string | null; request_image_url?: string | null }>;
  } | null;
};

export type GreenApiCatalogPayload = {
  name: string;
  countryCode: "AR";
  price: string;
  description: string;
  imageUrl: string;
  currency: "PEN";
  retailerId: string;
  url: string;
  isHidden: boolean;
};

export type GreenApiCatalogClient = {
  getProducts: () => Promise<GreenApiCatalogProduct[]>;
  createProduct: (payload: GreenApiCatalogPayload) => Promise<{ productId?: string }>;
  editProduct: (payload: GreenApiCatalogPayload & { productId: string }) => Promise<{ productId?: string; edited?: boolean }>;
};

export type GreenApiCatalogSyncItem = {
  productId: string;
  action: "create" | "update" | "skip" | "error";
  hidden: boolean;
  providerProductId?: string;
  errorCode?: string;
};

export type GreenApiCatalogSyncResult = {
  mode: GreenApiCatalogMode;
  planned: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  items: GreenApiCatalogSyncItem[];
};

function publicHttpsUrl(value: string | undefined): URL {
  if (!value) throw new Error("GREEN_API_CATALOG_SITE_URL_MISSING");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("GREEN_API_CATALOG_SITE_URL_INVALID");
  }
  if (url.protocol !== "https:") throw new Error("GREEN_API_CATALOG_SITE_URL_NOT_HTTPS");
  return url;
}

function absoluteUrl(baseUrl: URL, path: string): string {
  return new URL(path, baseUrl).toString();
}

function moneyString(cents: number): string {
  return (cents / 100).toFixed(2);
}

function descriptionForCatalog(product: Product): string {
  return [product.description, `Notas: ${product.tastingNotes}`, `Marida con: ${product.pairings.join(", ")}.`]
    .join(" ")
    .replace(/\s+/g, " ")
    .slice(0, 1_500);
}

export function buildGreenApiCatalogPayload(args: {
  product: Product;
  siteUrl: string;
  hidden: boolean;
}): GreenApiCatalogPayload {
  const siteUrl = publicHttpsUrl(args.siteUrl);
  const image = args.product.image;
  if (!image) throw new Error(`GREEN_API_CATALOG_IMAGE_MISSING:${args.product.id}`);
  const singleBottleTier = args.product.tiers.find((tier) => tier.minQty === 1);
  if (!singleBottleTier) throw new Error(`GREEN_API_CATALOG_PRICE_MISSING:${args.product.id}`);

  return {
    name: args.product.name.slice(0, 150),
    // The products are Argentine wines. Green API requests ISO 3166-1 alpha-2.
    countryCode: "AR",
    price: moneyString(singleBottleTier.packTotalCents),
    description: descriptionForCatalog(args.product),
    imageUrl: absoluteUrl(siteUrl, image),
    currency: "PEN",
    retailerId: args.product.id,
    url: absoluteUrl(siteUrl, `/producto/${args.product.slug}`),
    isHidden: args.hidden,
  };
}

function toMinorUnits(price: string | null | undefined): number | null {
  if (!price || !/^\d+(?:\.\d{1,2})?$/.test(price)) return null;
  if (price.includes(".")) return Math.round(Number(price) * 100);
  const value = Number(price);
  return Number.isSafeInteger(value) ? value : null;
}

function shouldUpdate(existing: GreenApiCatalogProduct, desired: GreenApiCatalogPayload, force: boolean): boolean {
  if (force) return true;
  const desiredMinor = Math.round(Number(desired.price) * 100);
  return (
    existing.name !== desired.name ||
    existing.description !== desired.description ||
    existing.currency !== desired.currency ||
    existing.url !== desired.url ||
    Boolean(existing.is_hidden) !== desired.isHidden ||
    toMinorUnits(existing.price) !== desiredMinor
  );
}

function providerError(method: string, status: number): Error {
  return new Error(`GREEN_API_CATALOG_${method.toUpperCase()}_FAILED_${status}`);
}

function createGreenApiCatalogClient(config: GreenApiConfig, businessChatId: string): GreenApiCatalogClient {
  const request = async <T>(method: string, payload: Record<string, unknown>): Promise<T> => {
    const response = await fetch(
      `${config.apiUrl}/waInstance${config.instanceId}/${method}/${config.apiToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      },
    );
    if (!response.ok) throw providerError(method, response.status);
    return (await response.json().catch(() => ({}))) as T;
  };

  return {
    async getProducts() {
      const response = await request<unknown>("getProducts", { chatId: businessChatId });
      return Array.isArray(response) ? (response as GreenApiCatalogProduct[]) : [];
    },
    createProduct(payload) {
      return request<{ productId?: string }>("createProduct", payload);
    },
    editProduct(payload) {
      return request<{ productId?: string; edited?: boolean }>("editProduct", payload);
    },
  };
}

async function readAvailability(db: SupabaseClient, productIds: string[]): Promise<Map<string, number>> {
  const { data, error } = await db
    .from("inventory_availability")
    .select("product_id, available")
    .in("product_id", productIds);
  if (error) throw error;
  return new Map(
    (data ?? []).map((row) => [
      String(row.product_id),
      typeof row.available === "number" ? row.available : Number(row.available ?? 0),
    ]),
  );
}

function waitBetweenCatalogMutations(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, REQUEST_SPACING_MS));
}

export async function syncGreenApiCatalog(args: {
  mode: GreenApiCatalogMode;
  productId?: string;
  forceHidden?: boolean;
  force?: boolean;
  products?: Product[];
  siteUrl?: string;
  client?: GreenApiCatalogClient;
  availability?: Map<string, number>;
  db?: SupabaseClient;
}): Promise<GreenApiCatalogSyncResult> {
  const allProducts = args.products ?? PRODUCTS;
  const products = args.productId ? allProducts.filter((product) => product.id === args.productId) : allProducts;
  if (!products.length) throw new Error("GREEN_API_CATALOG_PRODUCT_NOT_FOUND");

  const siteUrl = args.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL;
  const availability = args.availability ?? await readAvailability(args.db ?? getSupabaseAdmin(), products.map((product) => product.id));

  let client = args.client;
  if (!client) {
    const config = getGreenApiConfig();
    const businessPhone = process.env.GREEN_API_BUSINESS_PHONE?.trim();
    const businessChatId = businessPhone ? greenApiChatId(businessPhone) : null;
    if (!config || !businessChatId) throw new Error("GREEN_API_CATALOG_NOT_CONFIGURED");
    client = createGreenApiCatalogClient(config, businessChatId);
  }

  const existingProducts = await client.getProducts();
  const existingByRetailerId = new Map(
    existingProducts
      .filter((product) => typeof product.retailer_id === "string" && product.retailer_id.length > 0)
      .map((product) => [product.retailer_id as string, product]),
  );

  const result: GreenApiCatalogSyncResult = {
    mode: args.mode,
    planned: products.length,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    items: [],
  };

  for (const product of products) {
    const hidden = args.forceHidden === true || (availability.get(product.id) ?? 0) <= 0;
    const desired = buildGreenApiCatalogPayload({ product, siteUrl: siteUrl ?? "", hidden });
    const existing = existingByRetailerId.get(product.id);
    const action = !existing ? "create" : shouldUpdate(existing, desired, args.force === true) ? "update" : "skip";

    if (args.mode === "dry-run" || action === "skip") {
      result.items.push({ productId: product.id, action, hidden, providerProductId: existing?.id });
      if (action === "skip") result.skipped += 1;
      continue;
    }

    try {
      const providerResult = action === "create"
        ? await client.createProduct(desired)
        : await client.editProduct({ ...desired, productId: existing.id });
      result.items.push({
        productId: product.id,
        action,
        hidden,
        providerProductId: providerResult.productId ?? existing?.id,
      });
      if (action === "create") result.created += 1;
      else result.updated += 1;
      if (products.length > 1) await waitBetweenCatalogMutations();
    } catch (error) {
      result.failed += 1;
      result.items.push({
        productId: product.id,
        action: "error",
        hidden,
        providerProductId: existing?.id,
        errorCode: error instanceof Error ? error.message : "GREEN_API_CATALOG_SYNC_FAILED",
      });
    }
  }

  return result;
}
