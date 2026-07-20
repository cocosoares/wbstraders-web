import { Check, MessageCircle, Sparkles } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { Reveal } from "@/components/reveal";
import { TrackedAnchor, TrackedLink } from "@/components/tracked-link";
import { PRODUCTS_BY_ID } from "@/data/products";
import { SITE } from "@/data/site";

interface OccasionLandingProps {
  slug: string;
  eyebrow: string;
  title: string;
  intro: string;
  selectionTitle: string;
  selectionIntro: string;
  productIds: string[];
  tips: { title: string; description: string }[];
  catalogHref?: string;
  whatsappMessage: string;
}

export function OccasionLanding({
  slug,
  eyebrow,
  title,
  intro,
  selectionTitle,
  selectionIntro,
  productIds,
  tips,
  catalogHref = "/catalogo",
  whatsappMessage,
}: OccasionLandingProps) {
  const products = productIds
    .map((id) => PRODUCTS_BY_ID.get(id))
    .filter((product): product is NonNullable<typeof product> => Boolean(product));

  return (
    <main>
      <section className="bg-olive-900 text-cream-50">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
          <Reveal>
            <p className="text-xs font-semibold tracking-[0.25em] text-olive-200 uppercase">
              {eyebrow}
            </p>
            <h1 className="mt-4 max-w-4xl font-display text-4xl leading-tight font-semibold sm:text-5xl">
              {title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-cream-200/90 sm:text-lg">
              {intro}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <TrackedLink
                href={catalogHref}
                eventName="occasion_cta_clicked"
                eventParams={{ occasion_slug: slug, placement: "hero", action: "shop" }}
                className="rounded-xl bg-wine-600 px-7 py-4 font-bold text-cream-50 transition-colors hover:bg-wine-500"
              >
                Comprar vinos
              </TrackedLink>
              <TrackedLink
                href="/arma-tu-caja"
                eventName="occasion_cta_clicked"
                eventParams={{ occasion_slug: slug, placement: "hero", action: "build_box" }}
                className="rounded-xl border border-cream-50/30 px-7 py-4 font-semibold text-cream-50 transition-colors hover:bg-cream-50/10"
              >
                Armar una caja
              </TrackedLink>
            </div>
            <p className="mt-6 text-xs font-semibold tracking-wide text-olive-200 uppercase">
              {SITE.legal.ageWarning} {SITE.legal.alcoholWarning}
            </p>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <Reveal>
          <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-wine-600 uppercase">
            <Sparkles className="h-4 w-4" /> Selección para la ocasión
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
            {selectionTitle}
          </h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-ink-700">
            {selectionIntro}
          </p>
        </Reveal>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product, index) => (
            <Reveal key={product.id} delay={index * 0.08}>
              <ProductCard product={product} />
            </Reveal>
          ))}
        </div>
      </section>

      <section className="bg-olive-50 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold">
              Tres claves para elegir
            </h2>
          </Reveal>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {tips.map((tip, index) => (
              <Reveal key={tip.title} delay={index * 0.08}>
                <article className="h-full rounded-2xl border border-olive-100 bg-cream-50 p-6">
                  <Check className="h-5 w-5 text-olive-600" aria-hidden="true" />
                  <h3 className="mt-4 font-display text-xl font-semibold">
                    {tip.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-700">
                    {tip.description}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
        <Reveal>
          <MessageCircle className="mx-auto h-7 w-7 text-wine-600" aria-hidden="true" />
          <h2 className="mt-3 font-display text-3xl font-semibold">
            ¿Prefieres una recomendación personal?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-700">
            Cuéntanos el menú, cuántas personas son y el rango que tienes en
            mente. Te ayudamos a elegir; la conversación no te obliga a comprar.
          </p>
          <TrackedAnchor
            href={`https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(whatsappMessage)}`}
            target="_blank"
            rel="noopener noreferrer"
            eventName="whatsapp_clicked"
            eventParams={{ context: "occasion_advice", occasion_slug: slug }}
            className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bg-olive-600 px-7 py-3.5 font-bold text-cream-50 transition-colors hover:bg-olive-700"
          >
            Pedir asesoría por WhatsApp
          </TrackedAnchor>
        </Reveal>
      </section>
    </main>
  );
}
