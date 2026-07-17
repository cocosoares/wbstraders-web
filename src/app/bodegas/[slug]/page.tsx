import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPin, Mountain, User } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { Reveal } from "@/components/reveal";
import { PRODUCTS } from "@/data/products";
import { SITE } from "@/data/site";
import { WINERIES, WINERIES_BY_SLUG } from "@/data/wineries";

export function generateStaticParams() {
  return WINERIES.map((w) => ({ slug: w.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const winery = WINERIES_BY_SLUG.get(slug);
  if (!winery) return {};
  return {
    title: `${winery.name} — ${winery.tagline}`,
    description: `${winery.name}: ${winery.origin}. ${winery.story[0]}`,
  };
}

export default async function WineryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const winery = WINERIES_BY_SLUG.get(slug);
  if (!winery) notFound();

  const wines = PRODUCTS.filter((p) => p.brand === winery.name);

  return (
    <div>
      <section className="bg-gradient-to-b from-olive-900 to-ink-900 py-16 text-cream-50">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <Reveal>
            <p className="text-xs font-semibold tracking-[0.25em] text-gold-500 uppercase">
              {winery.founded}
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">
              {winery.name}
            </h1>
            <p className="mt-3 text-lg text-cream-200">{winery.tagline}</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-olive-200">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> {winery.origin}
              </span>
              <span className="flex items-center gap-1.5">
                <Mountain className="h-4 w-4" /> {winery.altitude}
              </span>
              {winery.winemaker && (
                <span className="flex items-center gap-1.5">
                  <User className="h-4 w-4" /> {winery.winemaker}
                </span>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
        <div className="space-y-5">
          {winery.story.map((paragraph, index) => (
            <Reveal key={index} delay={index * 0.08}>
              <p className="leading-relaxed text-ink-700">{paragraph}</p>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2}>
          <dl className="mt-10 grid gap-4 rounded-2xl border border-cream-300 bg-cream-50 p-6 sm:grid-cols-2">
            {winery.highlights.map((item) => (
              <div key={item.label}>
                <dt className="text-xs font-semibold tracking-widest text-olive-600 uppercase">
                  {item.label}
                </dt>
                <dd className="mt-1 text-sm font-medium text-ink-900">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </section>

      {wines.length > 0 && (
        <section className="bg-cream-200/50 py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal>
              <h2 className="font-display text-2xl font-semibold sm:text-3xl">
                Vinos de {winery.name}
              </h2>
            </Reveal>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {wines.map((wine) => (
                <ProductCard key={wine.id} product={wine} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-4xl px-4 py-10 text-center sm:px-6">
        <p className="text-sm text-ink-500">
          ¿Quieres saber más sobre {winery.name}?{" "}
          <a
            href={`https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(`Hola, quisiera más información sobre los vinos de ${winery.name}.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-olive-600 underline-offset-2 hover:underline"
          >
            Escríbenos por WhatsApp
          </a>{" "}
          o vuelve al{" "}
          <Link
            href="/bodegas"
            className="font-semibold text-olive-600 underline-offset-2 hover:underline"
          >
            listado de bodegas
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
