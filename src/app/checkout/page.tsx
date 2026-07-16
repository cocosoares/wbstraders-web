import type { Metadata } from "next";
import { CheckoutClient } from "./checkout-client";

export const metadata: Metadata = {
  title: "Finalizar compra",
  description:
    "Completa tu pedido de vinos con delivery en Lima. Paga con Yape, Plin, transferencia BCP o tarjeta.",
  robots: { index: false },
};

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <p className="text-xs font-semibold tracking-[0.25em] text-wine-600 uppercase">
        Último paso
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold">
        Finalizar compra
      </h1>
      <div className="mt-10">
        <CheckoutClient />
      </div>
    </div>
  );
}
