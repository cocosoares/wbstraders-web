import Link from "next/link";
import { LogoIcon, LogoWordmark } from "@/components/logo";
import { SITE } from "@/data/site";

const SHOP_LINKS = [
  { href: "/catalogo", label: "Catálogo completo" },
  { href: "/catalogo?tipo=Tinto", label: "Vinos tintos" },
  { href: "/catalogo?tipo=Blanco", label: "Vinos blancos" },
  { href: "/arma-tu-caja", label: "Arma tu caja" },
  { href: "/bodegas", label: "Nuestras bodegas" },
];

const HELP_LINKS = [
  { href: "/#delivery", label: "Zonas y costos de delivery" },
  { href: "/#faq", label: "Preguntas frecuentes" },
  { href: "/libro-de-reclamaciones", label: "Libro de reclamaciones" },
];

const PAYMENT_METHODS = ["Yape", "Plin", "Transferencia BCP", "Visa", "Mastercard"];

export function Footer() {
  return (
    <footer id="contacto" className="border-t border-cream-300 bg-cream-200/60">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 text-ink-900">
              <LogoIcon />
              <LogoWordmark />
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ink-500">
              Importadores boutique de vinos de autor argentinos. La cava de
              los mejores restaurantes de Lima, ahora en tu mesa.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {PAYMENT_METHODS.map((method) => (
                <span
                  key={method}
                  className="rounded-full border border-cream-300 bg-cream-50 px-3 py-1 text-xs font-medium text-ink-700"
                >
                  {method}
                </span>
              ))}
            </div>
          </div>

          <nav aria-label="Tienda">
            <h3 className="font-display text-lg font-semibold">Tienda</h3>
            <ul className="mt-4 space-y-2.5">
              {SHOP_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-ink-500 transition-colors duration-200 hover:text-wine-600"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Ayuda">
            <h3 className="font-display text-lg font-semibold">Ayuda</h3>
            <ul className="mt-4 space-y-2.5">
              {HELP_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-ink-500 transition-colors duration-200 hover:text-wine-600"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h3 className="font-display text-lg font-semibold">Contacto</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-ink-500">
              <li>
                <a
                  href={`mailto:${SITE.email}`}
                  className="transition-colors duration-200 hover:text-wine-600"
                >
                  {SITE.email}
                </a>
              </li>
              {SITE.phones.map((phone) => (
                <li key={phone}>
                  <a
                    href={`tel:${phone.replace(/\s/g, "")}`}
                    className="transition-colors duration-200 hover:text-wine-600"
                  >
                    {phone}
                  </a>
                </li>
              ))}
              <li className="pt-1 text-xs">
                Yape: <span className="font-medium text-ink-700">{SITE.yape}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-cream-300 pt-6 text-center">
          <p className="text-xs font-semibold tracking-wider text-ink-500 uppercase">
            {SITE.legal.alcoholWarning}
          </p>
          <p className="mt-1 text-xs text-ink-300">
            {SITE.legal.ageWarning} · Ley N.º 28681
          </p>
          <p className="mt-3 text-xs text-ink-300">
            © {new Date().getFullYear()} WBStraders. Todos los derechos
            reservados. Lima, Perú.
          </p>
        </div>
      </div>
    </footer>
  );
}
