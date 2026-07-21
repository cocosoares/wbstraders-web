import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CheckoutClient } from "./checkout-client";
import { isTestCheckoutEnabled } from "@/lib/orders/test-checkout";

export const metadata: Metadata = {
  title: "Finalizar compra",
  description:
    "Completa tu pedido de vinos con delivery en Lima y elige pago online seguro o pago coordinado.",
  robots: { index: false },
};

export default function CheckoutPage() {
  const onlinePaymentEnabled =
    process.env.PAYMENT_PROVIDER?.trim().toLowerCase() === "mercadopago" &&
    Boolean(
      process.env.MERCADOPAGO_ACCESS_TOKEN?.trim() &&
        process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim(),
    );

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <p className="text-xs font-semibold tracking-[0.25em] text-wine-600 uppercase">
        Compra protegida
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold">
        Entrega y pago
      </h1>
      <p className="mt-3 max-w-2xl text-ink-700">
        Primero registramos tu pedido y reservamos el stock. Un pago solo se
        considera confirmado después de una validación segura; WhatsApp queda
        como canal de asistencia y seguimiento.
      </p>
      <Link
        href="/catalogo"
        className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-cream-300 px-5 py-3 font-semibold text-ink-700 transition-colors hover:bg-cream-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Seguir comprando
      </Link>
      <div className="mt-10">
        <CheckoutClient
          onlinePaymentEnabled={onlinePaymentEnabled}
          testCheckoutEnabled={isTestCheckoutEnabled()}
        />
      </div>
    </div>
  );
}
