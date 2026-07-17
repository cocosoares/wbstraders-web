"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { BottleArt } from "@/components/bottle-art";
import { bestUnitCents } from "@/lib/pricing";
import { cn, formatPEN, getWineBgGradient } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";
import type { Product } from "@/types";

export function ProductCard({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  const add = useCart((s) => s.add);
  const lowest = bestUnitCents(product);

  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-cream-300 bg-cream-50 transition-shadow duration-300 hover:shadow-xl hover:shadow-ink-900/5",
        className,
      )}
    >
      <Link
        href={`/producto/${product.slug}`}
        className={cn(
          "relative block bg-gradient-to-b px-6 pt-8 pb-4",
          getWineBgGradient(product.type)
        )}
        aria-label={`Ver detalle de ${product.name}`}
      >
        {product.badge && (
          <span className="absolute top-3 left-3 z-10 rounded-full bg-wine-600 px-3 py-1 text-[11px] font-semibold tracking-wide text-cream-50">
            {product.badge}
          </span>
        )}
        <div className="mx-auto flex h-52 items-end justify-center px-10 pt-6">
          <BottleArt
            product={product}
            className="h-48 drop-shadow-lg transition-transform duration-300 ease-out group-hover:-translate-y-2 group-hover:scale-[1.04]"
          />
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-[11px] font-semibold tracking-widest text-olive-600 uppercase">
          {product.brand}
        </p>
        <Link href={`/producto/${product.slug}`}>
          <h3 className="mt-1 font-display text-lg leading-snug font-semibold text-ink-900 transition-colors duration-200 hover:text-wine-600">
            {product.name}
          </h3>
        </Link>
        <p className="mt-1 text-xs text-ink-500">
          {product.type} · {product.region}
        </p>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-lg font-bold text-wine-600">
            Desde {formatPEN(lowest)}
          </span>
          <span className="text-xs text-ink-300 line-through">
            {formatPEN(product.regularUnitCents)}
          </span>
          <span className="text-xs text-ink-500">c/u</span>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => add(product.id)}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-olive-600 px-3 py-2.5 text-sm font-semibold text-cream-50 transition-colors duration-200 hover:bg-olive-700"
          >
            <Plus className="h-4 w-4" />
            Agregar
          </button>
          <Link
            href={`/producto/${product.slug}`}
            className="flex items-center justify-center rounded-lg border border-cream-300 px-4 py-2.5 text-sm font-semibold text-ink-700 transition-colors duration-200 hover:bg-cream-200"
          >
            Ver
          </Link>
        </div>
      </div>
    </article>
  );
}
