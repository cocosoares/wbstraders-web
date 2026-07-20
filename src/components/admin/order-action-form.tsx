"use client";

import { useActionState, useId } from "react";
import { LoaderCircle } from "lucide-react";
import {
  type AdminActionState,
  updateOrderFulfillment,
} from "@/app/admin/(protected)/actions";

const INITIAL_STATE: AdminActionState = { status: "idle", message: "" };

const STAGE_LABELS: Record<string, string> = {
  unfulfilled: "Sin preparar",
  reserved: "Reservado",
  preparing: "En preparación",
  shipped: "Despachado",
  delivered: "Entregado",
  cancelled: "Cancelado",
  returned: "Devuelto",
};

const NEXT_STAGE: Record<string, string> = {
  unfulfilled: "reserved",
  reserved: "preparing",
  preparing: "shipped",
  shipped: "delivered",
};

export function OrderActionForm({
  orderId,
  fulfillmentStatus,
  paymentStatus,
}: {
  orderId: string;
  fulfillmentStatus: string;
  paymentStatus: string;
}) {
  const messageId = useId();
  const [state, formAction, pending] = useActionState(
    updateOrderFulfillment,
    INITIAL_STATE,
  );
  const next = NEXT_STAGE[fulfillmentStatus];
  const paymentBlocksProgress =
    (next === "reserved" || next === "preparing") && paymentStatus !== "approved";
  const canCancel =
    paymentStatus !== "approved" &&
    !["cancelled", "delivered", "returned"].includes(fulfillmentStatus);
  const options = [paymentBlocksProgress ? null : next, canCancel ? "cancelled" : null].filter(
    (value): value is string => Boolean(value),
  );

  if (options.length === 0) {
    return (
      <p className="max-w-48 text-xs leading-5 text-ink-500">
        {paymentBlocksProgress
          ? "Esperando confirmación de pago."
          : "No hay una transición operativa disponible."}
      </p>
    );
  }

  return (
    <form action={formAction} className="min-w-48 space-y-2">
      <input type="hidden" name="orderId" value={orderId} />
      <label htmlFor={`${messageId}-stage`} className="sr-only">
        Nueva etapa del pedido
      </label>
      <select
        id={`${messageId}-stage`}
        name="fulfillmentStatus"
        defaultValue={options[0]}
        disabled={pending}
        aria-describedby={state.message ? messageId : undefined}
        className="min-h-11 w-full rounded-lg border border-cream-300 bg-white px-3 text-sm font-medium text-ink-900 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {options.map((stage) => (
          <option key={stage} value={stage}>
            {STAGE_LABELS[stage] || stage}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-olive-700 px-3 py-2 text-sm font-bold text-cream-50 transition-colors duration-200 hover:bg-olive-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {pending ? "Guardando…" : "Actualizar etapa"}
      </button>
      {state.message && (
        <p
          id={messageId}
          aria-live="polite"
          className={
            state.status === "success"
              ? "text-xs leading-5 text-olive-700"
              : "text-xs leading-5 text-wine-700"
          }
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
