import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { SITE } from "@/data/site";

export const metadata: Metadata = {
  title: "Libro de Reclamaciones",
  description:
    "Libro de Reclamaciones virtual de WBStraders, conforme al Código de Protección y Defensa del Consumidor (Ley N.º 29571).",
};

export default function ComplaintsBookPage() {
  const mailSubject = encodeURIComponent(
    "Libro de Reclamaciones — WBStraders",
  );
  const mailBody = encodeURIComponent(
    [
      "LIBRO DE RECLAMACIONES VIRTUAL — WBSTRADERS",
      "",
      "1. Datos del consumidor",
      "Nombre completo:",
      "Documento de identidad (DNI/CE):",
      "Domicilio:",
      "Teléfono:",
      "Correo electrónico:",
      "",
      "2. Identificación del bien contratado",
      "Producto/Pedido:",
      "Monto reclamado:",
      "",
      "3. Detalle de la reclamación",
      "Tipo (Reclamo/Queja):",
      "Detalle:",
      "Pedido del consumidor:",
    ].join("\n"),
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-wine-600 uppercase">
        <BookOpen className="h-4 w-4" /> Protección al consumidor
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold">
        Libro de Reclamaciones
      </h1>
      <p className="mt-4 leading-relaxed text-ink-700">
        Conforme a lo establecido en el Código de Protección y Defensa del
        Consumidor (Ley N.º 29571), WBStraders pone a tu disposición su Libro
        de Reclamaciones virtual. Tu reclamo o queja será atendido en un plazo
        máximo de 15 días hábiles.
      </p>

      <div className="mt-8 rounded-2xl border border-cream-300 bg-cream-50 p-7">
        <h2 className="font-display text-xl font-semibold">
          ¿Cómo registrar tu reclamo o queja?
        </h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-700">
          <li>
            <span className="font-semibold">Reclamo:</span> disconformidad
            relacionada con los productos o servicios adquiridos.
          </li>
          <li>
            <span className="font-semibold">Queja:</span> disconformidad no
            relacionada con los productos, sino con la atención al público.
          </li>
          <li>
            Envíanos el formulario con tus datos completos y el detalle del
            caso por cualquiera de estos canales:
          </li>
        </ol>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={`mailto:${SITE.email}?subject=${mailSubject}&body=${mailBody}`}
            className="rounded-xl bg-olive-600 px-6 py-3.5 text-sm font-bold text-cream-50 transition-colors duration-200 hover:bg-olive-700"
          >
            Registrar por correo
          </a>
          <a
            href={`https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent("Hola, deseo registrar un reclamo/queja en el Libro de Reclamaciones de WBStraders.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-cream-300 bg-cream-100 px-6 py-3.5 text-sm font-bold text-ink-700 transition-colors duration-200 hover:bg-cream-200"
          >
            Registrar por WhatsApp
          </a>
        </div>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-ink-500">
        Razón social: WBStraders · Lima, Perú · {SITE.email} ·{" "}
        {SITE.phones[0]}. La formulación del reclamo no impide acudir a otras
        vías de solución de controversias ni es requisito previo para
        interponer una denuncia ante INDECOPI.
      </p>
    </div>
  );
}
