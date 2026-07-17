import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Mountain } from "lucide-react";
import { Reveal } from "@/components/reveal";
import { WINERIES } from "@/data/wineries";

export const metadata: Metadata = {
  title: "Nuestras bodegas — Escala Humana, Finca Ambrosía y Viñas en Flor",
  description:
    "Conoce a las tres bodegas argentinas que WBStraders importa directamente a Perú: su terroir, filosofía y viñedos de altura en Mendoza y Salta.",
};

export default function WineriesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <p className="text-xs font-semibold tracking-[0.25em] text-wine-600 uppercase">
        Origen
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold">
        Nuestras bodegas
      </h1>
      <p className="mt-3 max-w-2xl text-ink-700">
        Importamos directamente de tres bodegas argentinas de autor. Conoce su
        terroir, su gente y la filosofía detrás de cada etiqueta.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {WINERIES.map((winery, index) => (
          <Reveal key={winery.slug} delay={index * 0.1}>
            <Link
              href={`/bodegas/${winery.slug}`}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-cream-300 bg-cream-50 transition-shadow duration-300 hover:shadow-xl hover:shadow-ink-900/5"
            >
              <div className="bg-gradient-to-b from-olive-900 to-ink-900 px-6 py-10 text-center">
                <p className="font-display text-2xl font-semibold text-cream-50">
                  {winery.name}
                </p>
                <p className="mt-1 text-sm text-gold-500">{winery.tagline}</p>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <p className="flex items-center gap-1.5 text-xs text-ink-500">
                  <MapPin className="h-3.5 w-3.5" /> {winery.origin}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-500">
                  <Mountain className="h-3.5 w-3.5" /> {winery.altitude}
                </p>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-ink-700">
                  {winery.story[0].slice(0, 140)}…
                </p>
                <span className="mt-4 text-sm font-semibold text-olive-600 transition-colors duration-200 group-hover:text-olive-700">
                  Conocer la bodega →
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
