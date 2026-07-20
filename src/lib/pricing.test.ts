import { describe, expect, it } from "vitest";
import { PRODUCTS_BY_ID } from "@/data/products";
import {
  bestUnitCents,
  discreteTotalCents,
  lineTotalCents,
  nextTier,
  priceCart,
  tierForQty,
  tierUnitCents,
} from "@/lib/pricing";

const get = (id: string) => {
  const product = PRODUCTS_BY_ID.get(id);
  if (!product) throw new Error(`Producto de prueba no encontrado: ${id}`);
  return product;
};

describe("tierForQty", () => {
  const livvera = get("livvera-malbec");

  it("aplica el precio oferta x1 para una botella", () => {
    expect(tierForQty(livvera.tiers, 1).packTotalCents).toBe(8664);
  });

  it("mantiene la escala x3 entre 3 y 5 botellas", () => {
    expect(tierForQty(livvera.tiers, 3).packTotalCents).toBe(23190);
    expect(tierForQty(livvera.tiers, 5).packTotalCents).toBe(23190);
  });

  it("desbloquea la escala x6 con 6 o más botellas", () => {
    expect(tierForQty(livvera.tiers, 6).packTotalCents).toBe(37290);
    expect(tierForQty(livvera.tiers, 9).packTotalCents).toBe(37290);
  });
});

describe("lineTotalCents", () => {
  it("devuelve el precio exacto de catálogo en múltiplos del pack", () => {
    const torrontes = get("1700-torrontes");
    const x12 = tierForQty(torrontes.tiers, 12);
    expect(lineTotalCents(x12, 12)).toBe(53990); // S/ 539.90 exacto
  });

  it("no inventa descuentos para cantidades intermedias", () => {
    const livvera = get("livvera-malbec");
    // Cuatro botellas se componen como pack x3 + una botella x1.
    expect(discreteTotalCents(livvera.tiers, 4)).toBe(23190 + 8664);
  });
});

describe("priceCart (grupos y/o compartidos)", () => {
  it("suma cepas de la misma línea para alcanzar la escala x6", () => {
    const pricing = priceCart([
      { product: get("livvera-bonarda"), qty: 2 },
      { product: get("livvera-malvasia"), qty: 2 },
      { product: get("livvera-sangiovese-rose"), qty: 2 },
    ]);
    expect(pricing.groups).toHaveLength(1);
    expect(pricing.groups[0].qty).toBe(6);
    expect(pricing.groups[0].subtotalCents).toBe(39990); // S/ 399.90 catálogo
    // Ahorro verificable vs precio x1 publicado: 6 * 8690 - 39990 = 12150
    expect(pricing.savingsCents).toBe(12150);
  });

  it("no mezcla escalas entre grupos distintos", () => {
    const pricing = priceCart([
      { product: get("livvera-malbec"), qty: 3 },
      { product: get("rn40-malbec"), qty: 2 },
    ]);
    expect(pricing.groups).toHaveLength(2);
    expect(pricing.subtotalCents).toBe(23190 + 11190);
    expect(pricing.bottles).toBe(5);
  });

  it("ignora líneas con cantidad cero", () => {
    const pricing = priceCart([{ product: get("casa-malbec"), qty: 0 }]);
    expect(pricing.groups).toHaveLength(0);
    expect(pricing.subtotalCents).toBe(0);
  });
});

describe("nextTier (nudge de upsell)", () => {
  it("indica cuántas botellas faltan para la siguiente escala", () => {
    const brut = get("ambrosia-brut-nature");
    const upcoming = nextTier(brut.tiers, 2);
    expect(upcoming?.minQty).toBe(4);
    expect(upcoming?.packTotalCents).toBe(20490);
  });

  it("devuelve null en la escala máxima", () => {
    const brut = get("ambrosia-brut-nature");
    expect(nextTier(brut.tiers, 4)).toBeNull();
  });
});

describe("precios unitarios", () => {
  it("calcula el unitario de una escala", () => {
    const livvera = get("livvera-malbec");
    expect(tierUnitCents(tierForQty(livvera.tiers, 6))).toBe(6215); // 372.90/6
  });

  it('calcula el mejor unitario para "Desde S/ ..."', () => {
    expect(bestUnitCents(get("rn40-malbec"))).toBe(3808); // 456.90/12
  });
});
