"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MessageCircle,
  RefreshCw,
} from "lucide-react";
import { SITE } from "@/data/site";
import { useCart } from "@/hooks/use-cart";
import { trackEvent } from "@/lib/analytics";
import { formatPEN } from "@/lib/utils";

interface PublicOrderStatus {
  orderId?: string;
  orderNumber: string;
  status: string;
  paymentStatus?: string;
  totalCents?: number;
  currency?: string;
}

type ViewState =
  | { kind: "loading" }
  | { kind: "invalid"; message: string }
  | { kind: "loaded"; order: PublicOrderStatus };

const PAID_STATES = new Set(["paid", "approved", "picking", "dispatched", "delivered"]);
const FAILED_STATES = new Set(["rejected", "cancelled", "payment_failed", "expired"]);

export function PaymentResultClient({ initialResult }: { initialResult: string }) {
  const searchParams = useSearchParams();
  const clearCart = useCart((state) => state.clear);
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  const queryOrderId = searchParams.get("order");
  const queryToken = searchParams.get("token");

  useEffect(() => {
    let orderId = queryOrderId;
    let token = queryToken;

    if (!orderId || !token) {
      try {
        const stored = window.sessionStorage.getItem("wbs-last-order");
        const parsed = stored
          ? (JSON.parse(stored) as { orderId?: string; accessToken?: string })
          : null;
        orderId ||= parsed?.orderId ?? null;
        token ||= parsed?.accessToken ?? null;
      } catch {
        // The server query remains the source of truth; local storage is only a fallback.
      }
    }

    if (!orderId || !token) {
      setState({
        kind: "invalid",
        message: "No encontramos la referencia segura del pedido.",
      });
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(
          `/api/orders/${encodeURIComponent(orderId)}?token=${encodeURIComponent(token)}`,
          { cache: "no-store" },
        );
        const data = (await response.json()) as PublicOrderStatus & {
          error?: string | { message?: string };
        };
        if (!response.ok || !data.orderNumber) {
          const apiMessage =
            typeof data.error === "string" ? data.error : data.error?.message;
          throw new Error(apiMessage || "No se pudo consultar el pedido.");
        }
        if (!cancelled) setState({ kind: "loaded", order: data });
      } catch (error) {
        if (!cancelled) {
          setState({
            kind: "invalid",
            message:
              error instanceof Error
                ? error.message
                : "No se pudo consultar el pedido.",
          });
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [queryOrderId, queryToken, attempt]);

  const resolved = useMemo(() => {
    if (state.kind !== "loaded") return initialResult;
    const paymentState = state.order.paymentStatus || state.order.status;
    if (PAID_STATES.has(paymentState) || PAID_STATES.has(state.order.status)) return "exito";
    if (FAILED_STATES.has(paymentState) || FAILED_STATES.has(state.order.status)) return "error";
    return "pendiente";
  }, [initialResult, state]);

  useEffect(() => {
    if (state.kind !== "loaded" || resolved !== "exito") return;
    clearCart();
    const dedupKey = `wbs-purchase-${state.order.orderNumber}`;
    if (window.localStorage.getItem(dedupKey)) return;
    trackEvent("purchase", {
      transaction_id: state.order.orderNumber,
      value: (state.order.totalCents ?? 0) / 100,
      currency: state.order.currency ?? "PEN",
    });
    window.localStorage.setItem(dedupKey, "1");
  }, [clearCart, resolved, state]);

  if (state.kind === "loading") {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center text-center" aria-live="polite">
        <LoaderCircle className="h-9 w-9 animate-spin text-olive-600" />
        <p className="mt-4 font-semibold text-ink-700">Consultando el estado seguro del pedido…</p>
      </div>
    );
  }

  if (state.kind === "invalid") {
    return (
      <div className="text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-wine-600" />
        <h1 className="mt-4 font-display text-3xl font-semibold">No pudimos verificar el pedido</h1>
        <p className="mx-auto mt-3 max-w-lg text-ink-700">{state.message} No realices un segundo pago sin confirmar primero el estado.</p>
        <button type="button" onClick={() => { setState({ kind: "loading" }); setAttempt((value) => value + 1); }} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-olive-600 px-6 py-3 font-bold text-cream-50 hover:bg-olive-700"><RefreshCw className="h-4 w-4" /> Reintentar</button>
      </div>
    );
  }

  const { order } = state;
  const whatsappText = encodeURIComponent(
    `Hola, quisiera ayuda con mi pedido ${order.orderNumber}.`,
  );

  return (
    <div className="text-center" aria-live="polite">
      {resolved === "exito" ? (
        <CheckCircle2 className="mx-auto h-14 w-14 text-olive-600" />
      ) : resolved === "error" ? (
        <AlertCircle className="mx-auto h-14 w-14 text-wine-600" />
      ) : (
        <Clock3 className="mx-auto h-14 w-14 text-gold-600" />
      )}
      <p className="mt-5 text-xs font-bold tracking-[0.22em] text-wine-600 uppercase">Pedido {order.orderNumber}</p>
      <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
        {resolved === "exito"
          ? "Pago confirmado"
          : resolved === "error"
            ? "El pago no se completó"
            : "Estamos verificando el pago"}
      </h1>
      <p className="mx-auto mt-4 max-w-xl leading-relaxed text-ink-700">
        {resolved === "exito"
          ? "Tu stock quedó confirmado y el pedido pasó a preparación. Te avisaremos cuando salga a reparto."
          : resolved === "error"
            ? "El pedido sigue registrado y la reserva es temporal; no prepararemos ni entregaremos hasta tener una confirmación válida."
            : "Algunos medios tardan unos minutos. Esta pantalla consulta el pedido interno; no usamos la redirección del navegador como prueba de pago."}
      </p>
      {typeof order.totalCents === "number" && (
        <p className="mt-4 text-lg font-bold text-wine-700 tabular-nums">Total: {formatPEN(order.totalCents)}</p>
      )}
      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        {resolved === "pendiente" && (
          <button type="button" onClick={() => { setState({ kind: "loading" }); setAttempt((value) => value + 1); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-olive-600 px-6 py-3 font-bold text-cream-50 hover:bg-olive-700"><RefreshCw className="h-4 w-4" /> Actualizar estado</button>
        )}
        <a href={`https://wa.me/${SITE.whatsapp}?text=${whatsappText}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cream-300 bg-cream-50 px-6 py-3 font-bold text-ink-700 hover:bg-cream-200"><MessageCircle className="h-5 w-5" /> Ayuda por WhatsApp</a>
        <Link href="/catalogo" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-cream-300 px-6 py-3 font-semibold text-ink-700 hover:bg-cream-200">Volver a la cava</Link>
      </div>
    </div>
  );
}
