import { describe, expect, it, vi } from "vitest";
import { PRODUCTS } from "@/data/products";
import {
  buildGreenApiCatalogPayload,
  syncGreenApiCatalog,
  type GreenApiCatalogClient,
} from "@/lib/greenapi/catalog";

const rn40 = PRODUCTS.find((product) => product.id === "rn40-malbec");
if (!rn40) throw new Error("RN40_PRODUCT_MISSING");

describe("Green API catalog synchronization", () => {
  it("builds a public, stable retailer product payload", () => {
    const payload = buildGreenApiCatalogPayload({
      product: rn40,
      siteUrl: "https://wbstraders.example/",
      hidden: true,
    });

    expect(payload).toMatchObject({
      retailerId: "rn40-malbec",
      price: "83.90",
      currency: "PEN",
      countryCode: "AR",
      isHidden: true,
      imageUrl: "https://wbstraders.example/products/rn40-malbec.webp",
      url: "https://wbstraders.example/producto/rn40-malbec",
    });
  });

  it("plans a hidden single product without writing in dry-run mode", async () => {
    const client: GreenApiCatalogClient = {
      getProducts: vi.fn().mockResolvedValue([]),
      createProduct: vi.fn(),
      editProduct: vi.fn(),
    };

    const result = await syncGreenApiCatalog({
      mode: "dry-run",
      productId: rn40.id,
      forceHidden: true,
      products: [rn40],
      siteUrl: "https://wbstraders.example",
      availability: new Map([[rn40.id, 1_000]]),
      client,
    });

    expect(result).toMatchObject({ planned: 1, created: 0, updated: 0, failed: 0 });
    expect(result.items).toEqual([{ productId: rn40.id, action: "create", hidden: true }]);
    expect(client.createProduct).not.toHaveBeenCalled();
  });

  it("edits a matching retailer product instead of creating a duplicate", async () => {
    const client: GreenApiCatalogClient = {
      getProducts: vi.fn().mockResolvedValue([
        {
          id: "provider-rn40",
          retailer_id: rn40.id,
          name: "Old RN40",
          description: "Old",
          price: "1",
          currency: "PEN",
          url: "https://old.example",
          is_hidden: false,
        },
      ]),
      createProduct: vi.fn(),
      editProduct: vi.fn().mockResolvedValue({ productId: "provider-rn40", edited: true }),
    };

    const result = await syncGreenApiCatalog({
      mode: "sync",
      productId: rn40.id,
      products: [rn40],
      siteUrl: "https://wbstraders.example",
      availability: new Map([[rn40.id, 1_000]]),
      client,
    });

    expect(result).toMatchObject({ updated: 1, created: 0, failed: 0 });
    expect(client.createProduct).not.toHaveBeenCalled();
    expect(client.editProduct).toHaveBeenCalledWith(expect.objectContaining({
      productId: "provider-rn40",
      retailerId: rn40.id,
      isHidden: false,
    }));
  });

  it("recognizes Green API's returned price representation without editing again", async () => {
    const desired = buildGreenApiCatalogPayload({
      product: rn40,
      siteUrl: "https://wbstraders.example",
      hidden: true,
    });
    const client: GreenApiCatalogClient = {
      getProducts: vi.fn().mockResolvedValue([
        {
          id: "provider-rn40",
          retailer_id: rn40.id,
          name: desired.name,
          description: desired.description,
          price: "83900",
          currency: desired.currency,
          url: desired.url,
          is_hidden: "TRUE",
        },
      ]),
      createProduct: vi.fn(),
      editProduct: vi.fn(),
    };

    const result = await syncGreenApiCatalog({
      mode: "sync",
      productId: rn40.id,
      forceHidden: true,
      products: [rn40],
      siteUrl: "https://wbstraders.example",
      availability: new Map([[rn40.id, 1_000]]),
      client,
    });

    expect(result).toMatchObject({ skipped: 1, created: 0, updated: 0, failed: 0 });
    expect(client.editProduct).not.toHaveBeenCalled();
  });
});
