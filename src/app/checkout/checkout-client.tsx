"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageCircle, ShieldCheck } from "lucide-react";
import { allDistricts, findZoneByDistrict } from "@/data/delivery-zones";
import { SITE } from "@/data/site";
import { priceCart, type CartPricing } from "@/lib/pricing";
import { cn, formatPEN } from "@/lib/utils";
import { toCartLines, useCart } from "@/hooks/use-cart";

const PAYMENT_METHODS = [
  { id: "yape", label: "Yape" },
  { id: "plin", label: "Plin" },
  { id: "transferencia", label: "Transferencia BCP" },
  { id: "tarjeta", label: "Tarjeta de crédito/débito (te enviamos link de pago)" },
] as const;

type PaymentMethod = (typeof PAYMENT_METHODS)[number]["id"];

interface FormState {
  name: string;
  phone: string;
  email: string;
  district: string;
  address: string;
  reference: string;
  payment: PaymentMethod;
  notes: string;
}

const INITIAL_FORM: FormState = {
  name: "",
  phone: "",
  email: "",
  district: "",
  address: "",
  reference: "",
  payment: "yape",
  notes: "",
};

function validate(form: FormState): Partial<Record<keyof FormState, string>> {
  const errors: Partial<Record<keyof FormState, string>> = {};
  if (form.name.trim().length < 3) {
    errors.name = "Ingresa tu nombre completo.";
  }
  if (!/^9\d{8}$/.test(form.phone.trim())) {
    errors.phone = "Ingresa un celular válido de 9 dígitos (empieza con 9).";
  }
  if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
    errors.email = "El correo no parece válido.";
  }
  if (!form.district) {
    errors.district = "Elige tu distrito.";
  }
  if (form.address.trim().length < 5) {
    errors.address = "Ingresa la dirección de entrega.";
  }
  return errors;
}

function shippingFor(
  district: string,
  subtotalCents: number,
): { label: string; cents: number | null } {
  if (!district) return { label: "Por definir", cents: null };
  if (district === "otro") {
    return { label: "Por coordinar por WhatsApp", cents: null };
  }
  const zone = findZoneByDistrict(district);
  if (!zone) return { label: "Por coordinar", cents: null };
  if (subtotalCents >= zone.freeFromCents) {
    return { label: "Gratis", cents: 0 };
  }
  return { label: formatPEN(zone.costCents), cents: zone.costCents };
}

function buildWhatsAppMessage(
  form: FormState,
  pricing: CartPricing,
  shippingLabel: string,
  totalLabel: string,
): string {
  const items = pricing.groups
    .flatMap((group) =>
      group.lines.map(
        (line) =>
          `- ${line.qty} x ${line.product.name} (${formatPEN(group.unitCents)} c/u)`,
      ),
    )
    .join("\n");

  const paymentLabel =
    PAYMENT_METHODS.find((m) => m.id === form.payment)?.label ?? form.payment;

  return [
    "*Nuevo pedido — wbstraders.com*",
    "",
    `*Cliente:* ${form.name.trim()}`,
    `*Celular:* ${form.phone.trim()}`,
    form.email.trim() ? `*Email:* ${form.email.trim()}` : null,
    `*Entrega:* ${form.district === "otro" ? "Otro distrito (coordinar)" : form.district}`,
    `*Dirección:* ${form.address.trim()}`,
    form.reference.trim() ? `*Referencia:* ${form.reference.trim()}` : null,
    "",
    "*Pedido:*",
    items,
    "",
    `Subtotal: ${formatPEN(pricing.subtotalCents)}`,
    pricing.savingsCents > 0
      ? `Ahorro aplicado: ${formatPEN(pricing.savingsCents)}`
      : null,
    `Envío: ${shippingLabel}`,
    `*Total: ${totalLabel}*`,
    "",
    `*Método de pago:* ${paymentLabel}`,
    form.notes.trim() ? `*Notas:* ${form.notes.trim()}` : null,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

const inputClass =
  "w-full rounded-lg border border-cream-300 bg-cream-50 px-4 py-3 text-sm text-ink-900 placeholder:text-ink-300";

export function CheckoutClient() {
  const [mounted, setMounted] = useState(false);
  const items = useCart((s) => s.items);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});
  const [sent, setSent] = useState(false);

  useEffect(() => setMounted(true), []);

  const lines = mounted ? toCartLines(items) : [];
  const pricing = priceCart(lines);
  const shipping = shippingFor(form.district, pricing.subtotalCents);
  const totalCents =
    shipping.cents === null
      ? null
      : pricing.subtotalCents + shipping.cents;
  const totalLabel =
    totalCents === null
      ? `${formatPEN(pricing.subtotalCents)} + envío por coordinar`
      : formatPEN(totalCents);

  const setField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validate(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0 || lines.length === 0) return;

    const message = buildWhatsAppMessage(
      form,
      pricing,
      shipping.label,
      totalLabel,
    );
    window.open(
      `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
    setSent(true);
  };

  if (mounted && lines.length === 0 && !sent) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg text-ink-700">Tu carrito está vacío.</p>
        <Link
          href="/catalogo"
          className="mt-6 inline-block rounded-xl bg-olive-600 px-7 py-4 font-bold text-cream-50 transition-colors duration-200 hover:bg-olive-700"
        >
          Explorar la cava
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-10 lg:grid-cols-[1fr_24rem]">
      <div className="space-y-8">
        <section>
          <h2 className="font-display text-xl font-semibold">Tus datos</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
                Nombre completo *
              </label>
              <input
                id="name"
                type="text"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                className={inputClass}
                autoComplete="name"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-wine-600">{errors.name}</p>
              )}
            </div>
            <div>
              <label htmlFor="phone" className="mb-1.5 block text-sm font-medium">
                Celular *
              </label>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                placeholder="9XXXXXXXX"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                className={inputClass}
                autoComplete="tel-national"
              />
              {errors.phone && (
                <p className="mt-1 text-xs text-wine-600">{errors.phone}</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                Correo (opcional)
              </label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                className={inputClass}
                autoComplete="email"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-wine-600">{errors.email}</p>
              )}
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">Entrega</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="district"
                className="mb-1.5 block text-sm font-medium"
              >
                Distrito *
              </label>
              <select
                id="district"
                value={form.district}
                onChange={(e) => setField("district", e.target.value)}
                className={cn(inputClass, "cursor-pointer")}
              >
                <option value="">Elige tu distrito</option>
                {allDistricts().map(({ district }) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
                <option value="otro">Otro distrito (coordinar)</option>
              </select>
              {errors.district && (
                <p className="mt-1 text-xs text-wine-600">{errors.district}</p>
              )}
            </div>
            <div>
              <label
                htmlFor="address"
                className="mb-1.5 block text-sm font-medium"
              >
                Dirección *
              </label>
              <input
                id="address"
                type="text"
                placeholder="Av. / Calle, número, dpto."
                value={form.address}
                onChange={(e) => setField("address", e.target.value)}
                className={inputClass}
                autoComplete="street-address"
              />
              {errors.address && (
                <p className="mt-1 text-xs text-wine-600">{errors.address}</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label
                htmlFor="reference"
                className="mb-1.5 block text-sm font-medium"
              >
                Referencia (opcional)
              </label>
              <input
                id="reference"
                type="text"
                placeholder="Ej.: edificio verde, frente al parque"
                value={form.reference}
                onChange={(e) => setField("reference", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">Método de pago</h2>
          <div className="mt-4 space-y-2.5">
            {PAYMENT_METHODS.map((method) => (
              <label
                key={method.id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 text-sm font-medium transition-colors duration-200",
                  form.payment === method.id
                    ? "border-olive-600 bg-olive-50"
                    : "border-cream-300 bg-cream-50 hover:border-olive-200",
                )}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={form.payment === method.id}
                  onChange={() => setField("payment", method.id)}
                  className="h-4 w-4 accent-olive-600"
                />
                {method.label}
              </label>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-cream-200/70 p-4 text-xs leading-relaxed text-ink-700">
            <p className="font-semibold">Datos de pago:</p>
            <p className="mt-1">
              Yape/Plin: <span className="font-medium">{SITE.yape}</span> · BCP
              Soles: <span className="font-medium">{SITE.bcp.ctaSoles}</span> ·
              CCI: <span className="font-medium">{SITE.bcp.cci}</span>
            </p>
            <p className="mt-1 text-ink-500">
              Al confirmar por WhatsApp validamos tu pago y programamos la
              entrega al instante.
            </p>
          </div>
        </section>

        <section>
          <label htmlFor="notes" className="mb-1.5 block text-sm font-medium">
            Notas del pedido (opcional)
          </label>
          <textarea
            id="notes"
            rows={2}
            placeholder="Ej.: entregar después de las 6 p. m., es un regalo…"
            value={form.notes}
            onChange={(e) => setField("notes", e.target.value)}
            className={inputClass}
          />
        </section>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl border border-cream-300 bg-cream-50 p-6">
          <h2 className="font-display text-xl font-semibold">
            Resumen del pedido
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            {pricing.groups.flatMap((group) =>
              group.lines.map((line) => (
                <li
                  key={line.product.id}
                  className="flex justify-between gap-3"
                >
                  <span className="text-ink-700">
                    {line.qty} x {line.product.name}
                  </span>
                  <span className="shrink-0 font-medium">
                    {formatPEN(group.unitCents * line.qty)}
                  </span>
                </li>
              )),
            )}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-cream-300 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">Subtotal</dt>
              <dd className="font-medium">
                {formatPEN(pricing.subtotalCents)}
              </dd>
            </div>
            {pricing.savingsCents > 0 && (
              <div className="flex justify-between text-olive-600">
                <dt>Ahorro por volumen</dt>
                <dd className="font-semibold">
                  −{formatPEN(pricing.savingsCents)}
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-ink-500">Envío</dt>
              <dd className="font-medium">{shipping.label}</dd>
            </div>
            <div className="flex justify-between border-t border-cream-300 pt-3 text-base">
              <dt className="font-bold">Total</dt>
              <dd className="font-bold text-wine-600">{totalLabel}</dd>
            </div>
          </dl>

          <button
            type="submit"
            className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-olive-600 px-6 py-4 font-bold text-cream-50 transition-colors duration-200 hover:bg-olive-700"
          >
            <MessageCircle className="h-5 w-5" />
            Confirmar pedido por WhatsApp
          </button>

          {sent && (
            <p className="mt-3 rounded-lg bg-olive-100 px-3 py-2 text-center text-xs font-semibold text-olive-700">
              Pedido enviado. Continúa la conversación en WhatsApp para
              confirmar el pago y la entrega.
            </p>
          )}

          <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-ink-500">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-olive-600" />
            Compra directa con el importador. {SITE.legal.ageWarning}
          </p>
        </div>
      </aside>
    </form>
  );
}
