import Link from "next/link";
import {
  Award,
  Boxes,
  Clock,
  CreditCard,
  Gift,
  GlassWater,
  MapPin,
  Store,
  Truck,
  Utensils,
} from "lucide-react";
import { FloatingBottle } from "@/components/floating-bottle";
import { ProductCard } from "@/components/product-card";
import { Reveal } from "@/components/reveal";
import { AskSommelierButton } from "@/components/sommelier-widget";
import { TrackedAnchor, TrackedLink } from "@/components/tracked-link";
import { DELIVERY_ZONES } from "@/data/delivery-zones";
import { BRANDS, PRODUCTS_BY_ID } from "@/data/products";
import { WINERIES } from "@/data/wineries";

const WINERIES_BY_NAME = new Map(WINERIES.map((w) => [w.name, w.slug]));
import { SITE } from "@/data/site";
import { formatPEN } from "@/lib/utils";

const FEATURED_IDS = [
  "rn40-malbec",
  "1700-torrontes",
  "livvera-malbec",
  "ambrosia-brut-nature",
];

const OCCASIONS = [
  {
    href: "/ocasiones/ceviche",
    slug: "ceviche",
    title: "Ceviche y cocina marina",
    description: "Blancos frescos para limón, ají y productos del mar.",
    icon: Utensils,
  },
  {
    href: "/ocasiones/parrilla",
    slug: "parrilla",
    title: "Parrilla",
    description: "Tintos argentinos para carnes y vegetales a la brasa.",
    icon: Utensils,
  },
  {
    href: "/ocasiones/nikkei",
    slug: "nikkei",
    title: "Mesa nikkei",
    description: "Frescura para cítricos, salinidad, umami y picante.",
    icon: GlassWater,
  },
  {
    href: "/ocasiones/celebracion",
    slug: "celebracion",
    title: "Celebraciones",
    description: "Burbujas y botellas especiales para compartir.",
    icon: GlassWater,
  },
  {
    href: "/regalos",
    slug: "regalo",
    title: "Regalos",
    description: "Etiquetas elegidas con intención, personales o corporativas.",
    icon: Gift,
  },
];

const FAQS = [
  {
    q: "¿En cuánto tiempo llega mi pedido?",
    a: "En Zona 1 (Miraflores, San Isidro, Surco, La Molina y distritos aledaños) entregamos en 24 horas. En el resto de Lima Metropolitana y Callao, entre 24 y 48 horas. Pedidos confirmados antes de las 4 p. m. suelen salir el mismo día.",
  },
  {
    q: "¿Cómo puedo pagar?",
    a: "Los medios disponibles se muestran al finalizar la compra. Tu pedido se considera pagado solo cuando el pago queda confirmado en el sistema; una captura de pantalla no sustituye esa confirmación.",
  },
  {
    q: "¿Puedo combinar cepas y mantener el descuento por volumen?",
    a: "Sí. Las cepas de una misma línea (por ejemplo, Livverá Bonarda, Malvasía y Sangiovese Rosé) se suman entre sí para alcanzar la escala de precio del pack. Usa la sección Arma tu caja para hacerlo en un clic.",
  },
  {
    q: "¿Venden a restaurantes y tiendas especializadas?",
    a: "Sí. Restaurantes, hoteles, bares y tiendas pueden solicitar una evaluación en nuestra página HORECA. La disponibilidad, precios y demás condiciones se confirman en una propuesta comercial.",
  },
];

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: { "@type": "Answer", text: faq.a },
  })),
};

function Hero() {
  const heroBottles = ["rn40-malbec", "1700-torrontes", "ambrosia-brut-nature"]
    .map((id) => PRODUCTS_BY_ID.get(id))
    .filter((p): p is NonNullable<typeof p> => !!p);

  return (
    <section className="overflow-hidden bg-olive-900 text-cream-50">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
        <Reveal>
          <p className="text-xs font-semibold tracking-[0.25em] text-olive-200 uppercase">
            Vinos de autor argentinos · Delivery en Lima
          </p>
          <h1 className="mt-4 font-display text-4xl leading-tight font-semibold sm:text-5xl">
            Elige el vino por lo que vas a comer,{" "}
            <span className="text-gold-500">celebrar o regalar</span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-cream-200/90">
            Escala Humana, Finca Ambrosía y Viñas en Flor: etiquetas de
            Gualtallary y Cafayate seleccionadas para la mesa peruana. Compra
            por botella o combina estilos en una caja.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <TrackedLink
              href="/catalogo"
              eventName="home_cta_clicked"
              eventParams={{ action: "shop", placement: "hero" }}
              className="rounded-xl bg-wine-600 px-7 py-4 font-bold text-cream-50 transition-colors duration-200 hover:bg-wine-500"
            >
              Ver el catálogo
            </TrackedLink>
            <TrackedLink
              href="/arma-tu-caja"
              eventName="home_cta_clicked"
              eventParams={{ action: "build_box", placement: "hero" }}
              className="rounded-xl border border-cream-50/30 px-7 py-4 font-semibold text-cream-50 transition-colors duration-200 hover:bg-cream-50/10"
            >
              Arma tu caja
            </TrackedLink>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-olive-200">
            <span className="flex items-center gap-1.5">
              <Truck className="h-4 w-4" /> Delivery desde 24 h en Lima
            </span>
            <span className="flex items-center gap-1.5">
              <CreditCard className="h-4 w-4" /> Pago seguro · confirmación verificable
            </span>
            <span className="flex items-center gap-1.5">
              <Award className="h-4 w-4" /> Etiquetas 93+ pts.
            </span>
          </div>
        </Reveal>
        <Reveal delay={0.15} className="hidden md:block">
          <div className="relative mx-auto flex h-96 max-w-sm items-end justify-center gap-4 rounded-t-full bg-olive-800/60 px-10 pt-10">
            {heroBottles.map((product, index) => (
              <FloatingBottle
                key={product.id}
                product={product}
                delay={index * 0.6}
                priority={index === 1}
                className={index === 1 ? "h-80" : "h-64"}
              />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Brands() {
  return (
    <section id="bodegas" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
      <Reveal>
        <p className="text-xs font-semibold tracking-[0.25em] text-wine-600 uppercase">
          Nuestras bodegas
        </p>
        <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
          Tres joyas argentinas, una sola cava
        </h2>
      </Reveal>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {BRANDS.map((brand, index) => (
          <Reveal key={brand.name} delay={index * 0.1}>
            <Link
              href={`/bodegas/${WINERIES_BY_NAME.get(brand.name) ?? ""}`}
              className="group block h-full rounded-2xl border border-cream-300 bg-cream-50 p-7 transition-shadow duration-300 hover:shadow-xl hover:shadow-ink-900/5"
            >
              <h3 className="font-display text-2xl font-semibold transition-colors duration-200 group-hover:text-wine-600">
                {brand.name}
              </h3>
              <p className="mt-1 flex items-center gap-1 text-xs text-ink-500">
                <MapPin className="h-3.5 w-3.5" /> {brand.origin}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-ink-700">
                {brand.blurb}
              </p>
              <span className="mt-5 inline-block text-sm font-semibold text-olive-600 transition-colors duration-200 group-hover:text-olive-700">
                Conocer la bodega →
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Featured() {
  const featured = FEATURED_IDS.map((id) => PRODUCTS_BY_ID.get(id)).filter(
    (p): p is NonNullable<typeof p> => !!p,
  );
  return (
    <section className="bg-cream-200/50 py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.25em] text-wine-600 uppercase">
              Selección destacada
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
              Los favoritos de la casa
            </h2>
          </div>
          <Link
            href="/catalogo"
            className="text-sm font-semibold text-olive-600 transition-colors duration-200 hover:text-olive-700"
          >
            Ver todo el catálogo →
          </Link>
        </Reveal>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((product, index) => (
            <Reveal key={product.id} delay={index * 0.08}>
              <ProductCard product={product} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ShopByOccasion() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.25em] text-wine-600 uppercase">
            Empieza por la ocasión
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
            Menos duda, una elección con sentido
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-700">
            Guías breves para elegir según el plato o el momento, con opciones
            concretas del catálogo y sin reglas complicadas.
          </p>
        </div>
        <TrackedLink
          href="/ocasiones"
          eventName="home_cta_clicked"
          eventParams={{ action: "view_occasions", placement: "occasion_section" }}
          className="text-sm font-semibold text-olive-600 transition-colors hover:text-olive-700"
        >
          Ver todas las ocasiones →
        </TrackedLink>
      </Reveal>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {OCCASIONS.map(({ icon: Icon, ...occasion }, index) => (
          <Reveal key={occasion.slug} delay={index * 0.06}>
            <TrackedLink
              href={occasion.href}
              eventName="occasion_selected"
              eventParams={{ occasion_slug: occasion.slug, placement: "home" }}
              className="group block h-full rounded-2xl border border-cream-300 bg-cream-50 p-5 transition-shadow hover:shadow-lg hover:shadow-ink-900/5"
            >
              <Icon className="h-5 w-5 text-olive-600" aria-hidden="true" />
              <h3 className="mt-4 font-display text-lg font-semibold group-hover:text-wine-600">
                {occasion.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-ink-500">
                {occasion.description}
              </p>
            </TrackedLink>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function MixMatchBanner() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <Reveal>
        <div className="flex flex-col items-start gap-6 rounded-3xl bg-wine-700 p-8 text-cream-50 sm:p-12 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-wine-100 uppercase">
              <Boxes className="h-4 w-4" /> Mix & Match
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
              Arma tu caja y desbloquea el precio del pack
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-wine-100">
              Combina cepas de una misma línea — por ejemplo 2 Bonarda, 2
              Malvasía y 2 Sangiovese Rosé — y desbloquea el precio del pack
              completo. Antes de agregar, verás la cantidad y el precio aplicable.
            </p>
          </div>
          <TrackedLink
            href="/arma-tu-caja"
            eventName="home_cta_clicked"
            eventParams={{ action: "build_box", placement: "mix_match" }}
            className="shrink-0 rounded-xl bg-cream-50 px-7 py-4 font-bold text-wine-700 transition-colors duration-200 hover:bg-cream-200"
          >
            Empezar mi caja
          </TrackedLink>
        </div>
      </Reveal>
    </section>
  );
}

function Delivery() {
  return (
    <section id="delivery" className="scroll-mt-20 bg-olive-50 py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <p className="text-xs font-semibold tracking-[0.25em] text-wine-600 uppercase">
            Delivery en Lima
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
            De nuestra cava a tu puerta
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {DELIVERY_ZONES.map((zone, index) => (
            <Reveal key={zone.id} delay={index * 0.1}>
              <div className="h-full rounded-2xl border border-olive-100 bg-cream-50 p-7">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-xl font-semibold">
                    {zone.name}
                  </h3>
                  <span className="flex items-center gap-1 rounded-full bg-olive-100 px-3 py-1 text-xs font-semibold text-olive-700">
                    <Clock className="h-3.5 w-3.5" /> {zone.eta}
                  </span>
                </div>
                <p className="mt-3 text-sm text-ink-700">
                  Envío {formatPEN(zone.costCents)} ·{" "}
                  <span className="font-semibold text-olive-700">
                    gratis desde {formatPEN(zone.freeFromCents)}
                  </span>
                </p>
                <p className="mt-3 text-xs leading-relaxed text-ink-500">
                  {zone.districts.join(" · ")}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.2}>
          <p className="mt-6 text-sm text-ink-500">
            ¿Tu distrito no aparece? Escríbenos por{" "}
            <TrackedAnchor
              href={`https://wa.me/${SITE.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              eventName="whatsapp_clicked"
              eventParams={{ location: "delivery_help" }}
              className="font-semibold text-olive-600 underline-offset-2 hover:underline"
            >
              WhatsApp
            </TrackedAnchor>{" "}
            y coordinamos tu entrega.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function SommelierTeaser() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <Reveal>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold tracking-[0.25em] text-wine-600 uppercase">
            Asistente con inteligencia artificial
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
            ¿No sabes qué vino elegir?
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink-700">
            Cuéntale a nuestro Sommelier IA qué vas a comer — un ceviche, una
            parrilla, un lomo saltado — o la ocasión que celebras, y te
            recomienda la botella exacta de nuestra cava con el pack de mejor
            ahorro.
          </p>
          <AskSommelierButton className="mx-auto mt-7 flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-olive-600 px-7 py-4 font-bold text-cream-50 transition-colors duration-200 hover:bg-olive-700" />
        </div>
      </Reveal>
    </section>
  );
}

function B2B() {
  return (
    <section className="bg-ink-900 py-16 text-cream-50">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 sm:px-6 md:flex-row md:items-center md:justify-between">
        <Reveal>
          <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-gold-500 uppercase">
            <Store className="h-4 w-4" /> Canal HORECA
          </p>
          <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold">
            Vinos para restaurantes, hoteles y tiendas
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-cream-200/80">
            Si tienes un negocio gastronómico, revisamos tu carta, rotación y
            presupuesto para preparar una propuesta sujeta a stock y condiciones comerciales.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <TrackedLink
            href="/horeca"
            eventName="home_cta_clicked"
            eventParams={{ action: "view_horeca", placement: "horeca_banner" }}
            className="shrink-0 rounded-xl bg-gold-500 px-7 py-4 font-bold text-ink-900 transition-colors duration-200 hover:bg-gold-600"
          >
            Conocer canal HORECA
          </TrackedLink>
        </Reveal>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-16 sm:px-6">
      <Reveal>
        <h2 className="text-center font-display text-3xl font-semibold sm:text-4xl">
          Preguntas frecuentes
        </h2>
      </Reveal>
      <div className="mt-8 space-y-3">
        {FAQS.map((faq, index) => (
          <Reveal key={faq.q} delay={index * 0.05}>
            <details className="group rounded-xl border border-cream-300 bg-cream-50 p-5">
              <summary className="cursor-pointer list-none font-semibold text-ink-900 transition-colors duration-200 group-open:text-wine-600">
                {faq.q}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-ink-700">
                {faq.a}
              </p>
            </details>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }}
      />
      <Hero />
      <Brands />
      <Featured />
      <ShopByOccasion />
      <MixMatchBanner />
      <Delivery />
      <SommelierTeaser />
      <B2B />
      <Faq />
    </>
  );
}
