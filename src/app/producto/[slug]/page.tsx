import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Award, Grape, MapPin, Mountain } from "lucide-react";
import { BottleArt } from "@/components/bottle-art";
import { ProductCard } from "@/components/product-card";
import { TierSelector } from "@/components/tier-selector";
import { PRODUCTS, PRODUCTS_BY_SLUG, groupSiblings } from "@/data/products";
import { SITE } from "@/data/site";
import { bestUnitCents } from "@/lib/pricing";
import { formatPEN } from "@/lib/utils";
import type { Product } from "@/types";

export function generateStaticParams() {
  return PRODUCTS.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = PRODUCTS_BY_SLUG.get(slug);
  if (!product) return {};
  return {
    title: `${product.name} — Comprar online con delivery en Lima`,
    description: `${product.name} (${product.brand}, ${product.region}). ${product.description} Desde ${formatPEN(bestUnitCents(product))} por botella. Delivery en Lima, paga con Yape o tarjeta.`,
  };
}

function productJsonLd(product: Product) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    brand: { "@type": "Brand", name: product.brand },
    category: `Vino ${product.type}`,
    url: `${SITE.url}/producto/${product.slug}`,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "PEN",
      lowPrice: (bestUnitCents(product) / 100).toFixed(2),
      highPrice: (product.regularUnitCents / 100).toFixed(2),
      offerCount: product.tiers.length,
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: SITE.name },
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = PRODUCTS_BY_SLUG.get(slug);
  if (!product) notFound();

  const siblings = groupSiblings(product);
  const related = PRODUCTS.filter(
    (p) => p.id !== product.id && !siblings.some((s) => s.id === p.id),
  ).slice(0, 4);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd(product)),
        }}
      />

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="relative">
          {product.badge && (
            <span className="absolute top-4 left-4 z-10 rounded-full bg-wine-600 px-3 py-1 text-xs font-semibold text-cream-50">
              {product.badge}
            </span>
          )}
          <div className="flex h-[28rem] items-end justify-center rounded-2xl bg-gradient-to-b from-olive-900 to-ink-900 px-10 pt-12 sm:h-[32rem]">
            <BottleArt product={product} className="h-96 sm:h-[26rem]" priority />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-[0.25em] text-olive-600 uppercase">
            {product.brand} · {product.line}
          </p>
          <h1 className="mt-2 font-display text-4xl leading-tight font-semibold">
            {product.name}
          </h1>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-500">
            <span className="flex items-center gap-1.5">
              <Grape className="h-4 w-4" /> {product.grapes.join(", ")} ·{" "}
              {product.type}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" /> {product.region}
            </span>
            {product.altitude && (
              <span className="flex items-center gap-1.5">
                <Mountain className="h-4 w-4" /> {product.altitude}
              </span>
            )}
          </div>

          {product.ratings && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gold-500/15 px-3 py-1.5 text-sm font-semibold text-gold-600">
              <Award className="h-4 w-4" /> {product.ratings}
            </p>
          )}

          <p className="mt-5 leading-relaxed text-ink-700">
            {product.description}
          </p>

          <div className="mt-5 rounded-xl border border-cream-300 bg-cream-50 p-4">
            <h2 className="text-xs font-semibold tracking-widest text-ink-500 uppercase">
              Nota de cata
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-700">
              {product.tastingNotes}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {product.pairings.map((pairing) => (
                <span
                  key={pairing}
                  className="rounded-full bg-olive-100 px-3 py-1 text-xs font-medium text-olive-700"
                >
                  {pairing}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-7">
            <TierSelector product={product} siblings={siblings} />
          </div>
        </div>
      </div>

      {siblings.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-2xl font-semibold">
            Combínalo con estas cepas{" "}
            <span className="text-base font-normal text-ink-500">
              (suman para el descuento por volumen)
            </span>
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {siblings.map((sibling) => (
              <ProductCard key={sibling.id} product={sibling} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-16">
        <h2 className="font-display text-2xl font-semibold">
          También te puede gustar
        </h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {related.map((rel) => (
            <ProductCard key={rel.id} product={rel} />
          ))}
        </div>
      </section>
    </div>
  );
}
