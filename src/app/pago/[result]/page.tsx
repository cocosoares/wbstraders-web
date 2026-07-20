import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PaymentResultClient } from "./payment-result-client";

const VALID_RESULTS = new Set(["exito", "pendiente", "error"]);

export const metadata: Metadata = {
  title: "Estado del pedido",
  robots: { index: false, follow: false },
};

export default async function PaymentResultPage({
  params,
}: {
  params: Promise<{ result: string }>;
}) {
  const { result } = await params;
  if (!VALID_RESULTS.has(result)) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="rounded-3xl border border-cream-300 bg-cream-50 p-6 shadow-sm sm:p-10">
        <Suspense fallback={<p className="text-center text-ink-600">Consultando pedido…</p>}>
          <PaymentResultClient initialResult={result} />
        </Suspense>
      </div>
    </div>
  );
}
