"use client";

import Link from "next/link";
import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { tierUnitCents } from "@/lib/pricing";
import { cn, formatPEN } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";
import type { Product } from "@/types";

/**
 * Selector de escalas de precio del catálogo (x1, x2, x3, x6, x12...).
 * Empuja al cliente hacia el pack con mayor ahorro (upselling por volumen).
 */
export function TierSelector({
  product,
  siblings,
}: {
  product: Product;
  siblings: Product[];
}) {
  const add = useCart((s) => s.add);
  const [selected, setSelected] = useState(0);
  const bestIndex = product.tiers.length - 1;

  return (
    <div>
      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-ink-700">
          Elige tu pack
        </legend>
        <div className="space-y-2.5">
          {product.tiers.map((tier, index) => {
            const unit = tierUnitCents(tier);
            const regular = product.regularUnitCents * tier.minQty;
            const savings = regular - tier.packTotalCents;
            const isSelected = selected === index;
            return (
              <label
                key={tier.minQty}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 rounded-xl border-2 p-4 transition-colors duration-200",
                  isSelected
                    ? "border-olive-600 bg-olive-50"
                    : "border-cream-300 bg-cream-50 hover:border-olive-200",
                )}
              >
                <input
                  type="radio"
                  name="tier"
                  className="sr-only"
                  checked={isSelected}
                  onChange={() => setSelected(index)}
                />
                <div>
                  <p className="font-semibold text-ink-900">
                    {tier.minQty === 1
                      ? "1 botella"
                      : `${tier.minQty} botellas`}
                    {index === bestIndex && bestIndex > 0 && (
                      <span className="ml-2 rounded-full bg-wine-600 px-2 py-0.5 text-[10px] font-bold text-cream-50">
                        Mejor precio
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {formatPEN(unit)} c/u
                    {tier.label ? ` · ${tier.label}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-wine-600">
                    {formatPEN(tier.packTotalCents)}
                  </p>
                  {savings > 0 && (
                    <p className="text-xs font-medium text-olive-600">
                      Ahorras {formatPEN(savings)}
                    </p>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      </fieldset>

      <button
        type="button"
        onClick={() => add(product.id, product.tiers[selected].minQty)}
        className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-wine-600 px-6 py-4 text-base font-bold text-cream-50 transition-colors duration-200 hover:bg-wine-700"
      >
        <ShoppingBag className="h-5 w-5" />
        Agregar al carrito · {formatPEN(product.tiers[selected].packTotalCents)}
      </button>

      {siblings.length > 0 && (
        <p className="mt-4 rounded-lg bg-olive-50 p-3 text-xs leading-relaxed text-ink-700">
          <span className="font-semibold text-olive-700">
            Combina y conserva el precio:
          </span>{" "}
          puedes mezclar botellas de{" "}
          {siblings.map((sibling, i) => (
            <span key={sibling.id}>
              <Link
                href={`/producto/${sibling.slug}`}
                className="font-medium text-wine-600 underline-offset-2 hover:underline"
              >
                {sibling.name}
              </Link>
              {i < siblings.length - 1 ? ", " : " "}
            </span>
          ))}
          y las cantidades se suman para alcanzar la escala de descuento.
        </p>
      )}
    </div>
  );
}
