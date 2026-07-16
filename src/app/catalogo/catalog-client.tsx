"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { PRODUCTS } from "@/data/products";
import { cn } from "@/lib/utils";
import type { Brand, WineType } from "@/types";

const TYPES: (WineType | "Todos")[] = [
  "Todos",
  "Tinto",
  "Blanco",
  "Rosado",
  "Espumante",
];

const BRAND_OPTIONS: (Brand | "Todas")[] = [
  "Todas",
  "Escala Humana",
  "Finca Ambrosía",
  "Viñas en Flor",
];

interface CatalogClientProps {
  initialType?: string;
  initialBrand?: string;
}

export function CatalogClient({ initialType, initialBrand }: CatalogClientProps) {
  const [type, setType] = useState<WineType | "Todos">(
    TYPES.includes(initialType as WineType) ? (initialType as WineType) : "Todos",
  );
  const [brand, setBrand] = useState<Brand | "Todas">(
    BRAND_OPTIONS.includes(initialBrand as Brand)
      ? (initialBrand as Brand)
      : "Todas",
  );

  const filtered = useMemo(
    () =>
      PRODUCTS.filter(
        (p) =>
          (type === "Todos" || p.type === type) &&
          (brand === "Todas" || p.brand === brand),
      ),
    [type, brand],
  );

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Filtrar por tipo de vino"
        >
          {TYPES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setType(option)}
              aria-pressed={type === option}
              className={cn(
                "cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200",
                type === option
                  ? "bg-olive-600 text-cream-50"
                  : "border border-cream-300 bg-cream-50 text-ink-700 hover:bg-cream-200",
              )}
            >
              {option}
            </button>
          ))}
        </div>
        <div>
          <label htmlFor="brand-filter" className="sr-only">
            Filtrar por bodega
          </label>
          <select
            id="brand-filter"
            value={brand}
            onChange={(e) => setBrand(e.target.value as Brand | "Todas")}
            className="cursor-pointer rounded-lg border border-cream-300 bg-cream-50 px-4 py-2.5 text-sm font-medium text-ink-700"
          >
            {BRAND_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === "Todas" ? "Todas las bodegas" : option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-4 text-sm text-ink-500" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? "vino" : "vinos"}
      </p>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="mt-12 text-center text-ink-500">
          No encontramos vinos con esos filtros. Prueba otra combinación.
        </p>
      )}
    </div>
  );
}
