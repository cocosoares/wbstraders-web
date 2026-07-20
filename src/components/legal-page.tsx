import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { SITE } from "@/data/site";

interface LegalPageProps {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}

export function LegalPage({ eyebrow, title, intro, children }: LegalPageProps) {
  const missingProviderData = [
    !SITE.legal.businessName && "razón social",
    !SITE.legal.ruc && "RUC",
    !SITE.legal.address && "domicilio legal",
  ].filter(Boolean);

  return (
    <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <p className="text-xs font-semibold tracking-[0.25em] text-wine-600 uppercase">
        {eyebrow}
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold">{title}</h1>
      <p className="mt-4 leading-relaxed text-ink-700">{intro}</p>
      <p className="mt-3 text-xs text-ink-500">Última actualización: 17 de julio de 2026.</p>

      {missingProviderData.length > 0 && (
        <aside className="mt-8 rounded-2xl border border-gold-500/40 bg-cream-50 p-5" aria-label="Configuración legal pendiente">
          <p className="flex items-center gap-2 font-semibold text-ink-900">
            <AlertTriangle className="h-5 w-5 text-gold-600" aria-hidden="true" />
            Información del proveedor pendiente de configurar
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-700">
            Antes de publicar o aceptar pedidos reales deben completarse: {missingProviderData.join(", ")}.
            Estos valores se configuran mediante variables de entorno, no se sustituyen con datos ficticios.
          </p>
        </aside>
      )}

      <div className="mt-10 space-y-9 [&_a]:font-semibold [&_a]:text-wine-600 [&_a]:underline-offset-2 hover:[&_a]:underline [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_li]:text-sm [&_li]:leading-relaxed [&_p]:mt-3 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-ink-700 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
    </main>
  );
}
