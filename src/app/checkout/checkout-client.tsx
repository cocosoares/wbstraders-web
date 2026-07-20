"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CreditCard, LoaderCircle, ShieldCheck } from "lucide-react";
import { allDistricts, findZoneByDistrict } from "@/data/delivery-zones";
import { priceCart } from "@/lib/pricing";
import { cn, formatPEN } from "@/lib/utils";
import { toCartLines, useCart } from "@/hooks/use-cart";
import { trackEvent } from "@/lib/analytics";
import { captureBrowserAttribution } from "@/lib/attribution";
import { decodeWhatsAppCart } from "@/lib/whatsapp/cart-link";

type ReceiptType = "boleta" | "factura";
type PaymentMethod = "mercadopago" | "manual";

interface FormState {
  name: string;
  phone: string;
  email: string;
  district: string;
  address: string;
  reference: string;
  paymentMethod: PaymentMethod;
  testCoupon: string;
  receiptType: ReceiptType;
  documentNumber: string;
  businessName: string;
  fiscalAddress: string;
  notes: string;
  ageConfirmed: boolean;
  termsAccepted: boolean;
  marketingConsent: boolean;
}

const INITIAL_FORM: FormState = {
  name: "",
  phone: "",
  email: "",
  district: "",
  address: "",
  reference: "",
  paymentMethod: "mercadopago",
  testCoupon: "",
  receiptType: "boleta",
  documentNumber: "",
  businessName: "",
  fiscalAddress: "",
  notes: "",
  ageConfirmed: false,
  termsAccepted: false,
  marketingConsent: false,
};

type FieldErrors = Partial<Record<keyof FormState | "form", string>>;

function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {};
  if (form.name.trim().length < 3) errors.name = "Ingresa tu nombre completo.";
  if (!/^9\d{8}$/.test(form.phone.trim())) {
    errors.phone = "Ingresa un celular peruano de 9 dígitos que empiece con 9.";
  }
  if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
    errors.email = "Revisa el formato del correo.";
  }
  if (!form.district) errors.district = "Elige el distrito de entrega.";
  if (form.address.trim().length < 5) {
    errors.address = "Ingresa una dirección de entrega completa.";
  }
  if (form.receiptType === "factura") {
    if (!/^\d{11}$/.test(form.documentNumber.trim())) {
      errors.documentNumber = "La factura requiere un RUC de 11 dígitos.";
    }
    if (form.businessName.trim().length < 3) {
      errors.businessName = "Ingresa la razón social.";
    }
    if (form.fiscalAddress.trim().length < 5) {
      errors.fiscalAddress = "Ingresa el domicilio fiscal.";
    }
  } else if (form.documentNumber && !/^\d{8}$/.test(form.documentNumber.trim())) {
    errors.documentNumber = "El DNI debe tener 8 dígitos.";
  }
  if (!form.ageConfirmed) errors.ageConfirmed = "Debes confirmar que eres mayor de 18 años.";
  if (!form.termsAccepted) errors.termsAccepted = "Debes aceptar los términos de compra.";
  return errors;
}

function shippingFor(district: string, subtotalCents: number) {
  if (!district || district === "otro") {
    return { label: "Por coordinar", cents: null as number | null, eta: "" };
  }
  const zone = findZoneByDistrict(district);
  if (!zone) return { label: "Por coordinar", cents: null, eta: "" };
  const cents = subtotalCents >= zone.freeFromCents ? 0 : zone.costCents;
  return {
    label: cents === 0 ? "Gratis" : formatPEN(cents),
    cents,
    eta: zone.eta,
  };
}

const inputClass =
  "min-h-11 w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-3 text-base text-ink-900 placeholder:text-ink-300 disabled:cursor-not-allowed disabled:opacity-50";

function fieldError(id: keyof FormState, errors: FieldErrors) {
  if (!errors[id]) return null;
  return (
    <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm font-medium text-wine-700">
      {errors[id]}
    </p>
  );
}

export function CheckoutClient({
  onlinePaymentEnabled,
  testCheckoutEnabled,
}: {
  onlinePaymentEnabled: boolean;
  testCheckoutEnabled: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [checkoutLinkError, setCheckoutLinkError] = useState<string | null>(null);
  const items = useCart((state) => state.items);
  const replaceCart = useCart((state) => state.replace);
  const [form, setForm] = useState<FormState>(() => ({
    ...INITIAL_FORM,
    paymentMethod: onlinePaymentEnabled ? "mercadopago" : "manual",
  }));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    captureBrowserAttribution();
    async function hydrateIncomingCart() {
      const params = new URLSearchParams(window.location.search);
      const checkoutToken = params.get("wbs_checkout");
      try {
        if (checkoutToken && /^[a-f0-9]{64}$/.test(checkoutToken)) {
          const response = await fetch(
            `/api/whatsapp/checkout-session?token=${encodeURIComponent(checkoutToken)}`,
            { cache: "no-store" },
          );
          const data = (await response.json()) as { items?: Record<string, number>; error?: string };
          if (!response.ok || !data.items) {
            throw new Error(data.error || "No pudimos cargar tu seleccion.");
          }
          replaceCart(data.items);
          trackEvent("whatsapp_checkout_started", {
            item_count: Object.values(data.items).reduce((total, quantity) => total + quantity, 0),
            source: "whatsapp",
          });
          return;
        }

        // Compatibility with links emitted before opaque checkout sessions.
        const incomingCart = decodeWhatsAppCart(params.get("wbs_cart"));
        if (Object.keys(incomingCart).length > 0) {
          replaceCart(incomingCart);
          trackEvent("whatsapp_checkout_started", {
            item_count: Object.values(incomingCart).reduce((total, quantity) => total + quantity, 0),
            source: "whatsapp",
          });
        }
      } catch (error) {
        setCheckoutLinkError(
          error instanceof Error ? error.message : "No pudimos cargar tu seleccion de WhatsApp.",
        );
      } finally {
        setMounted(true);
      }
    }

    void hydrateIncomingCart();
  }, [replaceCart]);

  const lines = mounted ? toCartLines(items) : [];
  const pricing = priceCart(lines);
  const shipping = shippingFor(form.district, pricing.subtotalCents);
  const totalCents = shipping.cents === null ? null : pricing.subtotalCents + shipping.cents;

  useEffect(() => {
    if (!mounted || lines.length === 0) return;
    trackEvent("begin_checkout", {
      value: pricing.subtotalCents / 100,
      currency: "PEN",
      item_count: lines.reduce((total, line) => total + line.qty, 0),
    });
    // Debe registrarse una vez al montar el checkout, no en cada cambio del formulario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined, form: undefined }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validation = validate(form);
    if (lines.length === 0) validation.form = "Tu carrito está vacío.";
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      const first = Object.keys(validation).find((key) => key !== "form");
      if (first) document.getElementById(first)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            name: form.name.trim(),
            phone: form.phone.trim(),
            email: form.email.trim() || undefined,
          },
          delivery: {
            district: form.district,
            address: form.address.trim(),
            reference: form.reference.trim() || undefined,
          },
          paymentMethod: form.paymentMethod,
          testCoupon: testCheckoutEnabled ? form.testCoupon.trim() || undefined : undefined,
          fiscal: {
            receiptType: form.receiptType,
            documentType: form.receiptType === "factura" ? "ruc" : "dni",
            documentNumber: form.documentNumber.trim() || undefined,
            businessName: form.businessName.trim() || undefined,
            fiscalAddress: form.fiscalAddress.trim() || undefined,
          },
          notes: form.notes.trim() || undefined,
          marketingConsent: form.marketingConsent,
          ageConfirmed: form.ageConfirmed,
          termsAccepted: form.termsAccepted,
          items: lines.map((line) => ({ productId: line.product.id, qty: line.qty })),
          attribution: captureBrowserAttribution(),
        }),
      });

      const data = (await response.json()) as {
        error?: string | { message?: string };
        orderId?: string;
        orderNumber?: string;
        accessToken?: string;
        checkoutUrl?: string;
      };
      if (!response.ok || !data.orderId || !data.accessToken) {
        const apiMessage =
          typeof data.error === "string" ? data.error : data.error?.message;
        throw new Error(apiMessage || "No se pudo crear el pedido.");
      }

      window.sessionStorage.setItem(
        "wbs-last-order",
        JSON.stringify({
          orderId: data.orderId,
          orderNumber: data.orderNumber,
          accessToken: data.accessToken,
        }),
      );

      if (data.checkoutUrl) {
        trackEvent("payment_redirected", {
          provider: "mercadopago",
          value: (totalCents ?? pricing.subtotalCents) / 100,
          currency: "PEN",
        });
        window.location.assign(data.checkoutUrl);
        return;
      }

      const query = new URLSearchParams({
        order: data.orderId,
      });
      window.location.assign(`/pago/pendiente?${query.toString()}`);
    } catch (error) {
      setErrors({
        form:
          error instanceof Error
            ? error.message
            : "No pudimos crear el pedido. Intenta nuevamente.",
      });
      setSubmitting(false);
    }
  };

  if (mounted && lines.length === 0) {
    return (
      <div className="rounded-2xl border border-cream-300 bg-cream-50 px-6 py-16 text-center">
        <p className="text-lg text-ink-700">Tu carrito está vacío.</p>
        {checkoutLinkError && (
          <p role="alert" className="mx-auto mt-3 max-w-md text-sm leading-6 text-wine-700">
            {checkoutLinkError}
          </p>
        )}
        <Link
          href="/catalogo"
          className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-wine-600 px-7 py-3 font-bold text-cream-50 hover:bg-wine-700"
        >
          Elegir vinos
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-10 lg:grid-cols-[1fr_24rem]">
      <div className="space-y-9">
        <section aria-labelledby="customer-heading">
          <h2 id="customer-heading" className="font-display text-2xl font-semibold">1. Tus datos</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-semibold">Nombre completo *</label>
              <input id="name" value={form.name} onChange={(e) => setField("name", e.target.value)} className={inputClass} autoComplete="name" aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} />
              {fieldError("name", errors)}
            </div>
            <div>
              <label htmlFor="phone" className="mb-1.5 block text-sm font-semibold">Celular *</label>
              <input id="phone" type="tel" inputMode="numeric" placeholder="9XXXXXXXX" value={form.phone} onChange={(e) => setField("phone", e.target.value.replace(/\D/g, "").slice(0, 9))} className={inputClass} autoComplete="tel-national" aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "phone-error" : undefined} />
              {fieldError("phone", errors)}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="email" className="mb-1.5 block text-sm font-semibold">Correo <span className="font-normal text-ink-500">(para confirmación)</span></label>
              <input id="email" type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} className={inputClass} autoComplete="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} />
              {fieldError("email", errors)}
            </div>
          </div>
        </section>

        <section aria-labelledby="delivery-heading">
          <h2 id="delivery-heading" className="font-display text-2xl font-semibold">2. Entrega</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="district" className="mb-1.5 block text-sm font-semibold">Distrito *</label>
              <select id="district" value={form.district} onChange={(e) => setField("district", e.target.value)} className={cn(inputClass, "cursor-pointer")} aria-invalid={!!errors.district} aria-describedby={errors.district ? "district-error" : undefined}>
                <option value="">Elige tu distrito</option>
                {allDistricts().map(({ district }) => <option key={district} value={district}>{district}</option>)}
                <option value="otro">Otro distrito (coordinar)</option>
              </select>
              {fieldError("district", errors)}
            </div>
            <div>
              <label htmlFor="address" className="mb-1.5 block text-sm font-semibold">Dirección *</label>
              <input id="address" placeholder="Av./calle, número y dpto." value={form.address} onChange={(e) => setField("address", e.target.value)} className={inputClass} autoComplete="street-address" aria-invalid={!!errors.address} aria-describedby={errors.address ? "address-error" : undefined} />
              {fieldError("address", errors)}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="reference" className="mb-1.5 block text-sm font-semibold">Referencia <span className="font-normal text-ink-500">(opcional)</span></label>
              <input id="reference" value={form.reference} onChange={(e) => setField("reference", e.target.value)} className={inputClass} />
            </div>
          </div>
          {form.district && <p className="mt-3 rounded-xl bg-olive-50 p-3 text-sm text-olive-800">Envío: <strong>{shipping.label}</strong>{shipping.eta ? ` · ${shipping.eta}` : " · confirmaremos cobertura antes del despacho"}</p>}
        </section>

        <section aria-labelledby="receipt-heading">
          <h2 id="receipt-heading" className="font-display text-2xl font-semibold">3. Comprobante</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {(["boleta", "factura"] as const).map((type) => (
              <label key={type} className={cn("flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border-2 p-4 font-semibold capitalize", form.receiptType === type ? "border-olive-600 bg-olive-50" : "border-cream-300 bg-cream-50")}>
                <input type="radio" name="receiptType" checked={form.receiptType === type} onChange={() => setField("receiptType", type)} className="h-4 w-4 accent-olive-600" />
                {type}
              </label>
            ))}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="documentNumber" className="mb-1.5 block text-sm font-semibold">{form.receiptType === "factura" ? "RUC *" : "DNI (opcional)"}</label>
              <input id="documentNumber" inputMode="numeric" value={form.documentNumber} onChange={(e) => setField("documentNumber", e.target.value.replace(/\D/g, "").slice(0, form.receiptType === "factura" ? 11 : 8))} className={inputClass} aria-invalid={!!errors.documentNumber} aria-describedby={errors.documentNumber ? "documentNumber-error" : undefined} />
              {fieldError("documentNumber", errors)}
            </div>
            {form.receiptType === "factura" && <>
              <div>
                <label htmlFor="businessName" className="mb-1.5 block text-sm font-semibold">Razón social *</label>
                <input id="businessName" value={form.businessName} onChange={(e) => setField("businessName", e.target.value)} className={inputClass} aria-invalid={!!errors.businessName} aria-describedby={errors.businessName ? "businessName-error" : undefined} />
                {fieldError("businessName", errors)}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="fiscalAddress" className="mb-1.5 block text-sm font-semibold">Domicilio fiscal *</label>
                <input id="fiscalAddress" value={form.fiscalAddress} onChange={(e) => setField("fiscalAddress", e.target.value)} className={inputClass} aria-invalid={!!errors.fiscalAddress} aria-describedby={errors.fiscalAddress ? "fiscalAddress-error" : undefined} />
                {fieldError("fiscalAddress", errors)}
              </div>
            </>}
          </div>
        </section>

        <section aria-labelledby="payment-heading">
          <h2 id="payment-heading" className="font-display text-2xl font-semibold">4. Pago</h2>
          <div className="mt-4 space-y-3">
            {onlinePaymentEnabled && (
              <label className={cn("flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border-2 p-4", form.paymentMethod === "mercadopago" ? "border-olive-600 bg-olive-50" : "border-cream-300 bg-cream-50")}>
                <input type="radio" name="paymentMethod" checked={form.paymentMethod === "mercadopago"} onChange={() => setField("paymentMethod", "mercadopago")} className="mt-1 h-4 w-4 accent-olive-600" />
                <span><strong className="block">Pago online seguro</strong><span className="text-sm text-ink-600">Medios habilitados por la pasarela. El pedido se confirma por notificación del proveedor.</span></span>
              </label>
            )}
            <label className={cn("flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border-2 p-4", form.paymentMethod === "manual" ? "border-olive-600 bg-olive-50" : "border-cream-300 bg-cream-50")}>
              <input type="radio" name="paymentMethod" checked={form.paymentMethod === "manual"} onChange={() => setField("paymentMethod", "manual")} className="mt-1 h-4 w-4 accent-olive-600" />
              <span><strong className="block">Coordinar el pago</strong><span className="text-sm text-ink-600">Crearemos el pedido y te daremos un número antes de continuar por WhatsApp.</span></span>
            </label>
            {!onlinePaymentEnabled && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
                El pago online aún no está habilitado. Tu pedido quedará pendiente hasta que coordinemos y verifiquemos el pago.
              </p>
            )}
          </div>
          <label htmlFor="notes" className="mt-4 mb-1.5 block text-sm font-semibold">Notas del pedido <span className="font-normal text-ink-500">(opcional)</span></label>
          <textarea id="notes" rows={3} value={form.notes} onChange={(e) => setField("notes", e.target.value)} className={inputClass} placeholder="Horario, regalo u otra indicación" />
          {testCheckoutEnabled && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <label htmlFor="testCoupon" className="mb-1.5 block text-sm font-semibold text-amber-950">
                Código de prueba
              </label>
              <input
                id="testCoupon"
                value={form.testCoupon}
                onChange={(event) => setField("testCoupon", event.target.value)}
                className={inputClass}
                autoComplete="off"
                maxLength={64}
              />
              <p className="mt-2 text-sm text-amber-900">
                Solo para pruebas internas: crea el pedido sin redirigir a una pasarela. El pago seguirá pendiente.
              </p>
            </div>
          )}
        </section>

        <fieldset className="space-y-3 rounded-2xl border border-cream-300 bg-cream-50 p-5">
          <legend className="px-1 font-display text-lg font-semibold">Confirmaciones</legend>
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed"><input id="ageConfirmed" type="checkbox" checked={form.ageConfirmed} onChange={(e) => setField("ageConfirmed", e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-wine-600" /><span>Confirmo que soy mayor de 18 años y que un adulto presentará su documento al recibir. *</span></label>
          {fieldError("ageConfirmed", errors)}
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed"><input id="termsAccepted" type="checkbox" checked={form.termsAccepted} onChange={(e) => setField("termsAccepted", e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-wine-600" /><span>Acepto los <Link href="/terminos" className="font-semibold text-wine-600 underline">términos</Link> y las condiciones de <Link href="/envios-y-cambios" className="font-semibold text-wine-600 underline">envío y cambios</Link>. *</span></label>
          {fieldError("termsAccepted", errors)}
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed"><input type="checkbox" checked={form.marketingConsent} onChange={(e) => setField("marketingConsent", e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-olive-600" /><span>Quiero recibir novedades y recomendaciones por WhatsApp o correo. Opcional y revocable.</span></label>
        </fieldset>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl border border-cream-300 bg-cream-50 p-6 shadow-sm">
          <h2 className="font-display text-xl font-semibold">Resumen</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {pricing.groups.flatMap((group) => group.lines.map((line) => (
              <li key={line.product.id} className="flex justify-between gap-3"><span className="text-ink-700">{line.qty} × {line.product.name}</span><span className="shrink-0 font-semibold tabular-nums">{formatPEN(group.unitCents * line.qty)}</span></li>
            )))}
          </ul>
          <dl className="mt-5 space-y-2 border-t border-cream-300 pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-ink-500">Subtotal</dt><dd className="font-medium tabular-nums">{formatPEN(pricing.subtotalCents)}</dd></div>
            {pricing.savingsCents > 0 && <div className="flex justify-between text-olive-700"><dt>Ahorro por caja</dt><dd className="font-semibold tabular-nums">−{formatPEN(pricing.savingsCents)}</dd></div>}
            <div className="flex justify-between"><dt className="text-ink-500">Envío</dt><dd className="font-medium">{shipping.label}</dd></div>
            <div className="flex justify-between border-t border-cream-300 pt-3 text-lg"><dt className="font-bold">Total</dt><dd className="font-bold text-wine-700 tabular-nums">{totalCents === null ? `${formatPEN(pricing.subtotalCents)} + envío` : formatPEN(totalCents)}</dd></div>
          </dl>
          {errors.form && <p role="alert" className="mt-4 rounded-xl bg-wine-50 p-3 text-sm font-medium text-wine-700">{errors.form}</p>}
          <button type="submit" disabled={submitting || !mounted} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-wine-600 px-6 py-3.5 font-bold text-cream-50 transition-colors hover:bg-wine-700 disabled:cursor-wait disabled:opacity-60">
            {submitting ? <><LoaderCircle className="h-5 w-5 animate-spin" /> Creando pedido…</> : <><CreditCard className="h-5 w-5" /> Crear pedido y continuar</>}
          </button>
          <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-ink-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-olive-600" />El pago solo se confirma mediante el proveedor. No almacenamos datos de tarjeta.</p>
        </div>
      </aside>
    </form>
  );
}
