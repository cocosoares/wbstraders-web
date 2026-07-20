import type { Metadata } from "next";
import { GlassWater, Gift, Utensils } from "lucide-react";
import { TrackedLink } from "@/components/tracked-link";

export const metadata: Metadata = {
  title: "Vinos para cada ocasión",
  description:
    "Encuentra vinos argentinos para ceviche, parrilla, comida nikkei, celebraciones y regalos, con delivery en Lima.",
};

const OCCASIONS = [
  {
    href: "/ocasiones/ceviche",
    slug: "ceviche",
    title: "Ceviche y cocina marina",
    description: "Blancos frescos y secos que acompañan acidez, ají y productos del mar.",
    icon: Utensils,
  },
  {
    href: "/ocasiones/parrilla",
    slug: "parrilla",
    title: "Parrilla",
    description: "Tintos con fruta, frescura y estructura para carnes y vegetales a la brasa.",
    icon: Utensils,
  },
  {
    href: "/ocasiones/nikkei",
    slug: "nikkei",
    title: "Mesa nikkei",
    description: "Vinos tensos y versátiles para salinidad, cítricos, umami y picante.",
    icon: GlassWater,
  },
  {
    href: "/ocasiones/celebracion",
    slug: "celebracion",
    title: "Celebraciones",
    description: "Burbujas y botellas especiales para brindar, compartir y servir con comida.",
    icon: GlassWater,
  },
  {
    href: "/regalos",
    slug: "regalo",
    title: "Regalos",
    description: "Etiquetas para agradecer, felicitar o acompañar un momento importante.",
    icon: Gift,
  },
];

export default function OccasionsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <p className="text-xs font-semibold tracking-[0.25em] text-wine-600 uppercase">
        Comprar con una idea clara
      </p>
      <h1 className="mt-2 max-w-3xl font-display text-4xl font-semibold sm:text-5xl">
        Un vino para lo que vas a comer o celebrar
      </h1>
      <p className="mt-4 max-w-2xl leading-relaxed text-ink-700">
        Empieza por la ocasión. Cada guía explica qué buscar y reúne etiquetas
        del catálogo sin convertir el maridaje en una regla rígida.
      </p>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {OCCASIONS.map(({ icon: Icon, ...occasion }) => (
          <TrackedLink
            key={occasion.slug}
            href={occasion.href}
            eventName="occasion_selected"
            eventParams={{ occasion_slug: occasion.slug, placement: "occasion_index" }}
            className="group rounded-2xl border border-cream-300 bg-cream-50 p-7 transition-shadow hover:shadow-xl hover:shadow-ink-900/5"
          >
            <Icon className="h-6 w-6 text-olive-600" aria-hidden="true" />
            <h2 className="mt-5 font-display text-2xl font-semibold group-hover:text-wine-600">
              {occasion.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-700">
              {occasion.description}
            </p>
            <span className="mt-5 inline-block text-sm font-semibold text-olive-600">
              Ver selección →
            </span>
          </TrackedLink>
        ))}
      </div>
    </main>
  );
}
