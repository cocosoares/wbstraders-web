"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, LoaderCircle, Send } from "lucide-react";
import { SITE } from "@/data/site";

type SubmissionState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; claimNumber: string }
  | { status: "error"; message: string };

interface ClaimResponse {
  claimNumber?: unknown;
  status?: unknown;
  error?: { code?: unknown; message?: unknown };
}

const inputClass =
  "mt-2 min-h-11 w-full rounded-xl border border-cream-300 bg-cream-100 px-3.5 py-2.5 text-base font-normal text-ink-900 placeholder:text-ink-300 focus:border-wine-600 sm:text-sm";

function optionalText(value: FormDataEntryValue | null): string | undefined {
  const normalized = String(value ?? "").trim();
  return normalized || undefined;
}

function solesToCents(value: FormDataEntryValue | null): number | undefined {
  const normalized = String(value ?? "").trim();
  if (!normalized) return undefined;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) : undefined;
}

export function ConsumerClaimForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const [submission, setSubmission] = useState<SubmissionState>({ status: "idle" });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submission.status === "submitting") return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      customerName: String(data.get("customerName") ?? "").trim(),
      documentType: String(data.get("documentType") ?? ""),
      documentNumber: String(data.get("documentNumber") ?? "").trim(),
      address: String(data.get("address") ?? "").trim(),
      phone: String(data.get("phone") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      itemType: String(data.get("itemType") ?? ""),
      itemDescription: String(data.get("itemDescription") ?? "").trim(),
      orderNumber: optionalText(data.get("orderNumber")),
      amountCents: solesToCents(data.get("amountSoles")),
      claimType: String(data.get("claimType") ?? ""),
      detail: String(data.get("detail") ?? "").trim(),
      consumerRequest: String(data.get("consumerRequest") ?? "").trim(),
      privacyAccepted: data.get("privacyAccepted") === "on",
    };

    setSubmission({ status: "submitting" });
    try {
      const response = await fetch("/api/consumer-claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => ({}))) as ClaimResponse;

      if (!response.ok) {
        const message =
          typeof result.error?.message === "string"
            ? result.error.message
            : "No pudimos registrar el formulario. Revisa los datos e intenta nuevamente.";
        setSubmission({ status: "error", message });
        requestAnimationFrame(() => statusRef.current?.focus());
        return;
      }

      if (typeof result.claimNumber !== "string" || !result.claimNumber) {
        throw new Error("Respuesta de registro incompleta");
      }

      form.reset();
      setSubmission({ status: "success", claimNumber: result.claimNumber });
      requestAnimationFrame(() => statusRef.current?.focus());
    } catch {
      setSubmission({
        status: "error",
        message:
          "No pudimos conectar con el servicio de registro. Intenta nuevamente o usa el canal de soporte indicado abajo.",
      });
      requestAnimationFrame(() => statusRef.current?.focus());
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-8" noValidate={false}>
      <fieldset className="rounded-2xl border border-cream-300 bg-cream-50 p-5 sm:p-7">
        <legend className="px-2 font-display text-xl font-semibold">
          1. Identificación y contacto
        </legend>
        <p className="mt-1 text-sm text-ink-500">Todos los campos de esta sección son obligatorios.</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-semibold text-ink-700 sm:col-span-2">
            Nombre completo o razón social
            <input
              className={inputClass}
              name="customerName"
              type="text"
              autoComplete="name"
              minLength={2}
              maxLength={160}
              required
            />
          </label>

          <label className="text-sm font-semibold text-ink-700">
            Tipo de documento
            <select className={inputClass} name="documentType" defaultValue="" required>
              <option value="" disabled>Selecciona</option>
              <option value="dni">DNI</option>
              <option value="ce">Carné de extranjería</option>
              <option value="passport">Pasaporte</option>
              <option value="ruc">RUC</option>
            </select>
          </label>

          <label className="text-sm font-semibold text-ink-700">
            Número de documento
            <input
              className={inputClass}
              name="documentNumber"
              type="text"
              autoComplete="off"
              minLength={4}
              maxLength={20}
              pattern="[A-Za-z0-9-]+"
              title="Usa solo letras, números o guiones. El DNI requiere 8 dígitos y el RUC 11."
              required
            />
          </label>

          <label className="text-sm font-semibold text-ink-700 sm:col-span-2">
            Domicilio
            <input
              className={inputClass}
              name="address"
              type="text"
              autoComplete="street-address"
              minLength={5}
              maxLength={300}
              required
            />
          </label>

          <label className="text-sm font-semibold text-ink-700">
            Teléfono
            <input
              className={inputClass}
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              minLength={9}
              maxLength={32}
              placeholder="Ej. 999 999 999"
              required
            />
          </label>

          <label className="text-sm font-semibold text-ink-700">
            Correo electrónico
            <input
              className={inputClass}
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="rounded-2xl border border-cream-300 bg-cream-50 p-5 sm:p-7">
        <legend className="px-2 font-display text-xl font-semibold">
          2. Bien o servicio
        </legend>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-semibold text-ink-700">
            Tipo
            <select className={inputClass} name="itemType" defaultValue="product" required>
              <option value="product">Producto</option>
              <option value="service">Servicio</option>
            </select>
          </label>

          <label className="text-sm font-semibold text-ink-700">
            Número de pedido <span className="font-normal text-ink-500">(opcional)</span>
            <input className={inputClass} name="orderNumber" type="text" maxLength={40} />
          </label>

          <label className="text-sm font-semibold text-ink-700 sm:col-span-2">
            Identificación del producto o servicio
            <textarea
              className={inputClass}
              name="itemDescription"
              rows={3}
              minLength={2}
              maxLength={500}
              placeholder="Indica el producto, servicio o situación relacionada."
              required
            />
          </label>

          <label className="text-sm font-semibold text-ink-700">
            Monto relacionado en soles <span className="font-normal text-ink-500">(opcional)</span>
            <input
              className={inputClass}
              name="amountSoles"
              type="number"
              inputMode="decimal"
              min="0"
              max="1000000"
              step="0.01"
              placeholder="0.00"
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="rounded-2xl border border-cream-300 bg-cream-50 p-5 sm:p-7">
        <legend className="px-2 font-display text-xl font-semibold">
          3. Reclamo o queja
        </legend>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer gap-3 rounded-xl border border-cream-300 p-4 text-sm text-ink-700 has-[:checked]:border-wine-600 has-[:checked]:bg-wine-50">
            <input className="mt-1 h-4 w-4 accent-wine-600" name="claimType" type="radio" value="reclamo" required />
            <span><strong className="block text-ink-900">Reclamo</strong>Disconformidad relacionada con un producto o servicio.</span>
          </label>
          <label className="flex cursor-pointer gap-3 rounded-xl border border-cream-300 p-4 text-sm text-ink-700 has-[:checked]:border-wine-600 has-[:checked]:bg-wine-50">
            <input className="mt-1 h-4 w-4 accent-wine-600" name="claimType" type="radio" value="queja" required />
            <span><strong className="block text-ink-900">Queja</strong>Disconformidad con la atención u otro aspecto no referido directamente al producto.</span>
          </label>
        </div>

        <div className="mt-5 grid gap-5">
          <label className="text-sm font-semibold text-ink-700">
            Detalle
            <textarea
              className={inputClass}
              name="detail"
              rows={6}
              minLength={10}
              maxLength={4000}
              placeholder="Describe los hechos con fechas y la información que consideres relevante."
              required
            />
          </label>

          <label className="text-sm font-semibold text-ink-700">
            Pedido concreto del consumidor
            <textarea
              className={inputClass}
              name="consumerRequest"
              rows={4}
              minLength={5}
              maxLength={2000}
              placeholder="Indica qué solución solicitas."
              required
            />
          </label>
        </div>
      </fieldset>

      <div className="rounded-2xl border border-cream-300 bg-olive-50 p-5 sm:p-6">
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-ink-700">
          <input
            className="mt-1 h-5 w-5 shrink-0 accent-wine-600"
            name="privacyAccepted"
            type="checkbox"
            required
          />
          <span>
            Confirmo que la información proporcionada es correcta y acepto el tratamiento de mis datos para registrar y atender esta solicitud, según la{" "}
            <Link href="/privacidad" target="_blank" className="font-semibold text-wine-600 underline underline-offset-2">
              política de privacidad
            </Link>.
          </span>
        </label>
      </div>

      {submission.status === "success" && (
        <div
          ref={statusRef}
          tabIndex={-1}
          role="status"
          aria-live="polite"
          className="rounded-2xl border border-olive-200 bg-olive-50 p-5 focus:outline-none"
        >
          <p className="flex items-center gap-2 font-semibold text-olive-700">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> Formulario recibido
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-700">
            Tu número de recepción es <strong className="select-all text-ink-900">{submission.claimNumber}</strong>.
            Guárdalo para identificar esta solicitud. Este mensaje confirma la recepción técnica del formulario; no constituye una resolución del caso ni una validación legal final.
          </p>
        </div>
      )}

      {submission.status === "error" && (
        <div
          ref={statusRef}
          tabIndex={-1}
          role="alert"
          className="rounded-2xl border border-wine-400 bg-wine-50 p-5 focus:outline-none"
        >
          <p className="flex items-center gap-2 font-semibold text-wine-700">
            <AlertCircle className="h-5 w-5" aria-hidden="true" /> No se pudo registrar
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-700">{submission.message}</p>
          <p className="mt-2 text-sm text-ink-700">
            Si el problema continúa, escribe a <a className="font-semibold text-wine-600 underline" href={`mailto:${SITE.email}`}>{SITE.email}</a>.
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={submission.status === "submitting"}
        className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-wine-600 px-7 py-3.5 font-bold text-cream-50 transition-colors hover:bg-wine-700 disabled:cursor-wait disabled:opacity-70 sm:w-auto"
      >
        {submission.status === "submitting" ? (
          <><LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" /> Registrando…</>
        ) : (
          <><Send className="h-5 w-5" aria-hidden="true" /> Registrar formulario</>
        )}
      </button>
    </form>
  );
}
