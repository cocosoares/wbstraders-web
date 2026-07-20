"use client";

import { useActionState, useId } from "react";
import { LoaderCircle } from "lucide-react";
import {
  type AdminActionState,
  recordManualPayment,
} from "@/app/admin/(protected)/actions";

const INITIAL_STATE: AdminActionState = { status: "idle", message: "" };

export function ManualPaymentForm({
  orderId,
  totalCents,
  currency,
}: {
  orderId: string;
  totalCents: number;
  currency: string;
}) {
  const fieldId = useId();
  const [state, formAction, pending] = useActionState(
    recordManualPayment,
    INITIAL_STATE,
  );
  const exactAmount = (totalCents / 100).toFixed(2);

  return (
    <details className="min-w-56 rounded-lg border border-gold-500/40 bg-gold-500/10 p-3">
      <summary className="cursor-pointer text-sm font-bold text-ink-900">
        Conciliar pago coordinado
      </summary>
      <form action={formAction} className="mt-3 space-y-3">
        <input type="hidden" name="orderId" value={orderId} />
        <label className="block text-xs font-semibold text-ink-700" htmlFor={`${fieldId}-reference`}>
          Referencia de operación
        </label>
        <input
          id={`${fieldId}-reference`}
          name="reference"
          required
          minLength={4}
          maxLength={120}
          autoComplete="off"
          disabled={pending}
          placeholder="Código Yape o transferencia"
          className="min-h-11 w-full rounded-lg border border-cream-300 bg-white px-3 text-sm text-ink-900"
        />
        <label className="block text-xs font-semibold text-ink-700" htmlFor={`${fieldId}-amount`}>
          Monto verificado ({currency})
        </label>
        <input
          id={`${fieldId}-amount`}
          name="amount"
          required
          inputMode="decimal"
          pattern="\d{1,7}([.,]\d{1,2})?"
          defaultValue={exactAmount}
          disabled={pending}
          className="min-h-11 w-full rounded-lg border border-cream-300 bg-white px-3 text-sm tabular-nums text-ink-900"
        />
        <label className="block text-xs font-semibold text-ink-700" htmlFor={`${fieldId}-note`}>
          Evidencia de verificación
        </label>
        <textarea
          id={`${fieldId}-note`}
          name="note"
          required
          minLength={8}
          maxLength={500}
          rows={3}
          disabled={pending}
          placeholder="Ej.: revisado en banca a las 14:35"
          className="w-full rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm text-ink-900"
        />
        <label className="flex items-start gap-2 text-xs leading-5 text-ink-700">
          <input
            type="checkbox"
            name="confirmed"
            value="true"
            required
            disabled={pending}
            className="mt-1 h-4 w-4"
          />
          Verifiqué el abono en la cuenta receptora y el monto coincide con el pedido.
        </label>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-olive-700 px-3 py-2 text-sm font-bold text-cream-50 hover:bg-olive-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {pending ? "Conciliando…" : "Confirmar pago"}
        </button>
        {state.message && (
          <p
            aria-live="polite"
            className={state.status === "success" ? "text-xs text-olive-700" : "text-xs text-wine-700"}
          >
            {state.message}
          </p>
        )}
      </form>
    </details>
  );
}
