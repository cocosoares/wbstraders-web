import { describe, expect, it } from "vitest";
import { PRODUCTS } from "@/data/products";
import { getProductVisualPalette } from "@/lib/product-visuals";

describe("product image direction", () => {
  it("assigns a distinct visual tone to every catalog product", () => {
    const tones = PRODUCTS.map((product) => product.visualTone);

    expect(tones.every(Boolean)).toBe(true);
    expect(new Set(tones).size).toBe(PRODUCTS.length);
  });

  it("resolves a complete palette for every product", () => {
    for (const product of PRODUCTS) {
      const palette = getProductVisualPalette(product);

      expect(palette.highlight).toMatch(/^#[0-9a-f]{6}$/i);
      expect(palette.middle).toMatch(/^#[0-9a-f]{6}$/i);
      expect(palette.depth).toMatch(/^#[0-9a-f]{6}$/i);
      expect(palette.glow).toMatch(/^#[0-9a-f]{6}$/i);
      expect(palette.shadow).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
