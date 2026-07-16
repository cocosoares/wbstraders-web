import type { Metadata } from "next";
import { CatalogClient } from "./catalog-client";

export const metadata: Metadata = {
  title: "Catálogo de vinos — Delivery en Lima",
  description:
    "Compra vinos de autor argentinos online: Malbec, Torrontés, espumantes y blends premiados de Escala Humana, Finca Ambrosía y Viñas en Flor. Packs con hasta 50% de descuento y delivery en Lima.",
};

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; bodega?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <p className="text-xs font-semibold tracking-[0.25em] text-wine-600 uppercase">
        La cava
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold">
        Catálogo de vinos
      </h1>
      <p className="mt-3 max-w-2xl text-ink-700">
        Vinos de autor importados directamente de Argentina. Mientras más
        botellas lleves, menos pagas por cada una — y puedes combinar cepas de
        una misma línea.
      </p>
      <div className="mt-10">
        <CatalogClient initialType={params.tipo} initialBrand={params.bodega} />
      </div>
    </div>
  );
}
