import type { Metadata } from "next";
import { Download } from "lucide-react";
import { CatalogClient } from "./catalog-client";

export const metadata: Metadata = {
  title: "Catálogo de vinos — Delivery en Lima",
  description:
    "Compra vinos de autor argentinos online: Malbec, Torrontés, espumantes y blends de Escala Humana, Finca Ambrosía y Viñas en Flor. Precios de caja y delivery en Lima.",
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
      <a
        href="/catalogos/fiestas-patrias-2026.pdf"
        download
        className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-wine-600 px-5 py-3 text-sm font-bold text-cream-50 transition-colors hover:bg-wine-700"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        Descargar catálogo PDF
      </a>
      <p className="mt-2 text-xs text-ink-500">
        Catálogo Fiestas Patrias 2026 · PDF de 5 páginas
      </p>
      <div className="mt-10">
        <CatalogClient initialType={params.tipo} initialBrand={params.bodega} />
      </div>
    </div>
  );
}
