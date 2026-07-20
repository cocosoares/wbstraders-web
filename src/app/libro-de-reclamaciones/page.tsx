import type { Metadata } from "next";
import { AlertTriangle, BookOpen } from "lucide-react";
import { ConsumerClaimForm } from "@/components/consumer-claim-form";
import { SITE } from "@/data/site";

export const metadata: Metadata = {
  title: "Libro de Reclamaciones",
  description:
    "Formulario público para registrar un reclamo o queja dirigido a WBStraders y obtener un número de recepción.",
};

export default function ComplaintsBookPage() {
  const providerDataComplete = Boolean(
    SITE.legal.businessName && SITE.legal.ruc && SITE.legal.address,
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-wine-600 uppercase">
        <BookOpen className="h-4 w-4" aria-hidden="true" /> Protección al consumidor
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">
        Libro de Reclamaciones
      </h1>
      <p className="mt-4 max-w-3xl leading-relaxed text-ink-700">
        Usa este formulario para comunicar una disconformidad relacionada con
        un producto, servicio o atención de WBStraders. Al registrarlo recibirás
        un número que identifica la recepción de tu solicitud.
      </p>

      <section className="mt-8 grid gap-4 sm:grid-cols-2" aria-label="Diferencia entre reclamo y queja">
        <article className="rounded-2xl border border-cream-300 bg-cream-50 p-5">
          <h2 className="font-display text-xl font-semibold">Reclamo</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-700">
            Disconformidad relacionada directamente con un producto o servicio.
          </p>
        </article>
        <article className="rounded-2xl border border-cream-300 bg-cream-50 p-5">
          <h2 className="font-display text-xl font-semibold">Queja</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-700">
            Disconformidad con la atención u otro aspecto no referido directamente al producto o servicio.
          </p>
        </article>
      </section>

      {!providerDataComplete && (
        <aside className="mt-6 rounded-2xl border border-gold-500/40 bg-cream-50 p-5" aria-label="Configuración legal pendiente">
          <p className="flex items-center gap-2 font-semibold text-ink-900">
            <AlertTriangle className="h-5 w-5 text-gold-600" aria-hidden="true" />
            Datos del proveedor pendientes de configuración
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-700">
            Antes de publicar el formulario para operaciones reales deben completarse la razón social, RUC y domicilio legal en la configuración del sitio.
          </p>
        </aside>
      )}

      <div className="mt-10">
        <ConsumerClaimForm />
      </div>

      <section className="mt-10 border-t border-cream-300 pt-6 text-xs leading-relaxed text-ink-500">
        <h2 className="font-semibold text-ink-700">Datos del proveedor</h2>
        <p className="mt-2">
          Razón social: {SITE.legal.businessName || "[PENDIENTE DE CONFIGURAR]"} · RUC: {SITE.legal.ruc || "[PENDIENTE DE CONFIGURAR]"} · Domicilio: {SITE.legal.address || "[PENDIENTE DE CONFIGURAR]"} · Correo: {SITE.email} · Teléfono: {SITE.phones[0]}.
        </p>
        <p className="mt-3">
          Registrar el formulario no impide acudir a otras vías de solución de
          controversias ni constituye por sí mismo una resolución o aceptación de lo solicitado.
        </p>
      </section>
    </main>
  );
}
