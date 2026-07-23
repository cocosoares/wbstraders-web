"use client";

import { useMemo, useState } from "react";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { BottleArt } from "@/components/bottle-art";
import { ProductImageStage } from "@/components/product-image-stage";
import { PRODUCTS } from "@/data/products";
import { lineTotalCents, tierUnitCents } from "@/lib/pricing";
import { cn, formatPEN } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";
import type { PriceTier, Product } from "@/types";

interface MixGroup {
  id: string;
  lineName: string;
  brand: string;
  products: Product[];
  tiers: PriceTier[];
}

/** Líneas del catálogo con más de una cepa (aptas para mix & match). */
const MIX_GROUPS: MixGroup[] = (() => {
  const byGroup = new Map<string, Product[]>();
  for (const product of PRODUCTS) {
    const bucket = byGroup.get(product.pricingGroup) ?? [];
    byGroup.set(product.pricingGroup, [...bucket, product]);
  }
  return [...byGroup.entries()]
    .filter(([, products]) => products.length > 1)
    .map(([id, products]) => ({
      id,
      lineName: products[0].line,
      brand: products[0].brand,
      products,
      tiers: products[0].tiers.filter((tier) => tier.minQty > 1),
    }));
})();

export function MixMatchClient() {
  const add = useCart((s) => s.add);
  const [groupId, setGroupId] = useState(MIX_GROUPS[0].id);
  const [tierIndex, setTierIndex] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [added, setAdded] = useState(false);

  const group = useMemo(
    () => MIX_GROUPS.find((g) => g.id === groupId) ?? MIX_GROUPS[0],
    [groupId],
  );
  const tier = group.tiers[Math.min(tierIndex, group.tiers.length - 1)];
  const total = group.products.reduce(
    (acc, p) => acc + (counts[p.id] ?? 0),
    0,
  );
  const remaining = tier.minQty - total;
  const regularCents = group.products.reduce(
    (acc, p) => acc + p.regularUnitCents * (counts[p.id] ?? 0),
    0,
  );

  const selectGroup = (id: string) => {
    setGroupId(id);
    setTierIndex(0);
    setCounts({});
    setAdded(false);
  };

  const selectTier = (index: number) => {
    setTierIndex(index);
    setCounts({});
    setAdded(false);
  };

  const changeCount = (productId: string, delta: number) => {
    setCounts((prev) => {
      const current = prev[productId] ?? 0;
      const next = Math.max(0, current + delta);
      if (delta > 0 && total >= tier.minQty) return prev;
      return { ...prev, [productId]: next };
    });
    setAdded(false);
  };

  const addBoxToCart = () => {
    for (const product of group.products) {
      const qty = counts[product.id] ?? 0;
      if (qty > 0) add(product.id, qty);
    }
    setCounts({});
    setAdded(true);
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_24rem]">
      <div>
        {/* Paso 1: elegir línea */}
        <h2 className="text-sm font-semibold text-ink-700">
          1 · Elige la línea
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {MIX_GROUPS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => selectGroup(option.id)}
              aria-pressed={option.id === group.id}
              className={cn(
                "cursor-pointer rounded-xl border-2 p-4 text-left transition-colors duration-200",
                option.id === group.id
                  ? "border-olive-600 bg-olive-50"
                  : "border-cream-300 bg-cream-50 hover:border-olive-200",
              )}
            >
              <p className="font-display text-lg font-semibold">
                {option.lineName}
              </p>
              <p className="mt-0.5 text-xs text-ink-500">
                {option.brand} ·{" "}
                {option.products.map((p) => p.grapes.join("/")).join(" · ")}
              </p>
            </button>
          ))}
        </div>

        {/* Paso 2: elegir pack */}
        <h2 className="mt-8 text-sm font-semibold text-ink-700">
          2 · Elige el tamaño del pack
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {group.tiers.map((option, index) => (
            <button
              key={option.minQty}
              type="button"
              onClick={() => selectTier(index)}
              aria-pressed={index === tierIndex}
              className={cn(
                "cursor-pointer rounded-xl border-2 px-5 py-3 text-sm font-semibold transition-colors duration-200",
                index === tierIndex
                  ? "border-wine-600 bg-wine-50 text-wine-700"
                  : "border-cream-300 bg-cream-50 text-ink-700 hover:border-wine-100",
              )}
            >
              {option.minQty} botellas · {formatPEN(option.packTotalCents)}
              <span className="mt-0.5 block text-xs font-normal text-ink-500">
                {formatPEN(tierUnitCents(option))} c/u
                {option.label ? ` · ${option.label}` : ""}
              </span>
            </button>
          ))}
        </div>

        {/* Paso 3: llenar la caja */}
        <h2 className="mt-8 text-sm font-semibold text-ink-700">
          3 · Llena tu caja ({total}/{tier.minQty})
        </h2>
        <div className="mt-3 space-y-3">
          {group.products.map((product) => {
            const qty = counts[product.id] ?? 0;
            return (
              <div
                key={product.id}
                className="flex items-center gap-4 rounded-xl border border-cream-300 bg-cream-50 p-4"
              >
                <ProductImageStage
                  product={product}
                  className="h-20 w-12 shrink-0 rounded-md"
                >
                  <div className="flex h-full items-end justify-center">
                    <BottleArt product={product} className="h-20" />
                  </div>
                </ProductImageStage>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink-900">{product.name}</p>
                  <p className="text-xs text-ink-500">
                    {product.type} · {product.tastingNotes.split(".")[0]}.
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => changeCount(product.id, -1)}
                    disabled={qty === 0}
                    aria-label={`Quitar una botella de ${product.name}`}
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-cream-300 text-ink-700 transition-colors duration-200 hover:bg-cream-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-6 text-center font-bold">{qty}</span>
                  <button
                    type="button"
                    onClick={() => changeCount(product.id, 1)}
                    disabled={remaining <= 0}
                    aria-label={`Agregar una botella de ${product.name}`}
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-olive-600 text-cream-50 transition-colors duration-200 hover:bg-olive-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resumen fijo */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl border border-cream-300 bg-cream-50 p-6">
          <h2 className="font-display text-xl font-semibold">Tu caja</h2>
          <div
            className="mt-4 grid grid-cols-6 gap-1.5"
            aria-label={`Espacios de la caja: ${total} de ${tier.minQty} llenos`}
          >
            {Array.from({ length: tier.minQty }).map((_, index) => (
              <div
                key={index}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-lg border text-xs",
                  index < total
                    ? "border-olive-600 bg-olive-100 text-olive-700"
                    : "border-dashed border-cream-300 bg-cream-100 text-ink-300",
                )}
              >
                {index < total ? <Check className="h-4 w-4" /> : "+"}
              </div>
            ))}
          </div>

          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">Precio del pack</dt>
              <dd className="font-bold text-wine-600">
                {formatPEN(tier.packTotalCents)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Precio por botella</dt>
              <dd className="font-medium">{formatPEN(tierUnitCents(tier))}</dd>
            </div>
            {total === tier.minQty && regularCents > 0 && (
              <div className="flex justify-between text-olive-600">
                <dt>Ahorras</dt>
                <dd className="font-bold">
                  {formatPEN(regularCents - lineTotalCents(tier, total))}
                </dd>
              </div>
            )}
          </dl>

          {remaining > 0 ? (
            <p className="mt-4 rounded-lg bg-olive-50 px-3 py-2 text-xs text-ink-700">
              Te {remaining === 1 ? "falta" : "faltan"}{" "}
              <span className="font-bold">{remaining}</span>{" "}
              {remaining === 1 ? "botella" : "botellas"} para completar el pack.
            </p>
          ) : (
            <p className="mt-4 rounded-lg bg-olive-100 px-3 py-2 text-xs font-semibold text-olive-700">
              ¡Caja completa! Agrégala al carrito.
            </p>
          )}

          <button
            type="button"
            onClick={addBoxToCart}
            disabled={total !== tier.minQty}
            className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-wine-600 px-6 py-4 font-bold text-cream-50 transition-colors duration-200 hover:bg-wine-700 disabled:cursor-not-allowed disabled:bg-ink-300"
          >
            <ShoppingBag className="h-5 w-5" />
            Agregar caja · {formatPEN(tier.packTotalCents)}
          </button>

          {added && (
            <p className="mt-3 text-center text-xs font-semibold text-olive-700">
              Caja agregada al carrito. ¡Puedes armar otra!
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
