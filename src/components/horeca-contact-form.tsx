"use client";

import { useState, type FormEvent } from "react";
import { MessageCircle } from "lucide-react";
import { SITE } from "@/data/site";
import { trackEvent } from "@/lib/analytics";

const BUSINESS_TYPES = [
  "Restaurante",
  "Hotel",
  "Bar o wine bar",
  "Tienda especializada",
  "Catering o eventos",
  "Otro negocio gastronómico",
];

const VOLUME_RANGES = [
  "Aún no lo sé",
  "1 a 2 cajas al mes",
  "3 a 5 cajas al mes",
  "6 o más cajas al mes",
];

export function HorecaContactForm() {
  const [opened, setOpened] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const businessType = String(data.get("businessType") ?? "");
    const volume = String(data.get("volume") ?? "");
    const message = [
      "Hola WBStraders, quiero conversar sobre el canal HORECA.",
      `Negocio: ${String(data.get("businessName") ?? "")}`,
      `Tipo: ${businessType}`,
      `Distrito: ${String(data.get("location") ?? "")}`,
      `Compra estimada: ${volume}`,
      `Contacto: ${String(data.get("contactName") ?? "")}`,
      `Interés: ${String(data.get("interest") ?? "") || "Por definir"}`,
    ].join("\n");

    trackEvent("horeca_contact_started", {
      business_type: businessType,
      volume_range: volume,
      channel: "whatsapp",
    });
    setOpened(true);
    window.open(
      `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-cream-300 bg-cream-50 p-6 sm:p-8"
    >
      <h2 className="font-display text-2xl font-semibold">Cuéntanos sobre tu negocio</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-700">
        Al enviar, se abrirá WhatsApp con tu solicitud preparada. WBStraders no
        almacenará estos campos en el sitio; podrás revisar el mensaje antes de enviarlo.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-semibold text-ink-700">
          Nombre del negocio
          <input
            name="businessName"
            required
            autoComplete="organization"
            className="mt-2 min-h-11 w-full rounded-xl border border-cream-300 bg-cream-100 px-3.5 font-normal text-ink-900"
          />
        </label>
        <label className="text-sm font-semibold text-ink-700">
          Tipo de negocio
          <select
            name="businessType"
            required
            defaultValue=""
            className="mt-2 min-h-11 w-full rounded-xl border border-cream-300 bg-cream-100 px-3.5 font-normal text-ink-900"
          >
            <option value="" disabled>Selecciona una opción</option>
            {BUSINESS_TYPES.map((type) => <option key={type}>{type}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-ink-700">
          Distrito o ciudad
          <input
            name="location"
            required
            autoComplete="address-level2"
            className="mt-2 min-h-11 w-full rounded-xl border border-cream-300 bg-cream-100 px-3.5 font-normal text-ink-900"
          />
        </label>
        <label className="text-sm font-semibold text-ink-700">
          Compra estimada
          <select
            name="volume"
            required
            defaultValue=""
            className="mt-2 min-h-11 w-full rounded-xl border border-cream-300 bg-cream-100 px-3.5 font-normal text-ink-900"
          >
            <option value="" disabled>Selecciona un rango</option>
            {VOLUME_RANGES.map((range) => <option key={range}>{range}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-ink-700 sm:col-span-2">
          Persona de contacto
          <input
            name="contactName"
            required
            autoComplete="name"
            className="mt-2 min-h-11 w-full rounded-xl border border-cream-300 bg-cream-100 px-3.5 font-normal text-ink-900"
          />
        </label>
        <label className="text-sm font-semibold text-ink-700 sm:col-span-2">
          ¿Qué necesitas? <span className="font-normal text-ink-500">(opcional)</span>
          <textarea
            name="interest"
            rows={3}
            className="mt-2 w-full rounded-xl border border-cream-300 bg-cream-100 px-3.5 py-3 font-normal text-ink-900"
            placeholder="Carta de vinos, reposición, capacitación, regalos corporativos…"
          />
        </label>
      </div>

      <button
        type="submit"
        className="mt-6 inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-wine-600 px-6 py-3 font-bold text-cream-50 transition-colors hover:bg-wine-700"
      >
        <MessageCircle className="h-5 w-5" aria-hidden="true" />
        Preparar mensaje en WhatsApp
      </button>
      {opened && (
        <p role="status" className="mt-3 text-sm text-olive-700">
          Abrimos WhatsApp en otra pestaña. Revisa y envía allí tu solicitud.
        </p>
      )}
    </form>
  );
}
