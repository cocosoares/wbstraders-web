import type { Metadata } from "next";
import { ClipboardList, RefreshCw, Utensils } from "lucide-react";
import { HorecaContactForm } from "@/components/horeca-contact-form";
import { TrackedAnchor } from "@/components/tracked-link";
import { SITE } from "@/data/site";

export const metadata: Metadata = {
  title: "Vinos para restaurantes y canal HORECA",
  description:
    "Portafolio de vinos argentinos para restaurantes, hoteles, bares, tiendas especializadas y eventos en Lima.",
};

const SERVICES = [
  {
    icon: ClipboardList,
    title: "Selección para tu carta",
    description: "Revisamos estilo de cocina, rango de precios y rotación antes de proponer etiquetas.",
  },
  {
    icon: RefreshCw,
    title: "Reposición coordinada",
    description: "Acordamos cantidades, frecuencia y condiciones según disponibilidad y zona de entrega.",
  },
  {
    icon: Utensils,
    title: "Soporte de producto",
    description: "Compartimos fichas y orientación de servicio para las etiquetas incluidas en tu pedido.",
  },
];

export default function HorecaPage() {
  return (
    <main>
      <section className="bg-ink-900 text-cream-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="text-xs font-semibold tracking-[0.25em] text-gold-500 uppercase">
            Restaurantes · Hoteles · Bares · Tiendas
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-4xl font-semibold sm:text-5xl">
            Un portafolio argentino pensado para tu operación
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-cream-200/80 sm:text-lg">
            Conversemos sobre tu carta, rotación y presupuesto. La evaluación y
            la cotización son independientes de la tienda para consumidores.
          </p>
          <TrackedAnchor
            href={`mailto:${SITE.email}?subject=${encodeURIComponent("Consulta HORECA — WBStraders")}`}
            eventName="horeca_contact_started"
            eventParams={{ channel: "email", placement: "hero" }}
            className="mt-8 inline-flex min-h-11 items-center rounded-xl border border-cream-50/30 px-6 py-3 font-semibold text-cream-50 hover:bg-cream-50/10"
          >
            Prefiero escribir por correo
          </TrackedAnchor>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-5 md:grid-cols-3">
          {SERVICES.map(({ icon: Icon, title, description }) => (
            <article key={title} className="rounded-2xl border border-cream-300 bg-cream-50 p-6">
              <Icon className="h-6 w-6 text-olive-600" aria-hidden="true" />
              <h2 className="mt-4 font-display text-xl font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">{description}</p>
            </article>
          ))}
        </div>
        <div className="mt-12 grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
          <div>
            <h2 className="font-display text-3xl font-semibold">Cómo empezamos</h2>
            <ol className="mt-5 space-y-4 text-sm leading-relaxed text-ink-700">
              <li><strong>1. Diagnóstico breve:</strong> tipo de negocio, carta, rotación y necesidad.</li>
              <li><strong>2. Propuesta:</strong> etiquetas, cantidades y condiciones sujetas a stock.</li>
              <li><strong>3. Validación:</strong> resolvemos dudas y confirmamos los términos comerciales.</li>
              <li><strong>4. Pedido:</strong> pago, comprobante y entrega según lo acordado.</li>
            </ol>
            <p className="mt-6 rounded-xl bg-olive-50 p-4 text-sm leading-relaxed text-ink-700">
              Enviar una consulta no garantiza crédito, exclusividad, stock ni
              precio mayorista. Esas condiciones se confirman por escrito en cada propuesta.
            </p>
          </div>
          <HorecaContactForm />
        </div>
      </section>
    </main>
  );
}
