"use client";

import { useActionState, useId, useState } from "react";
import { LoaderCircle, PackagePlus } from "lucide-react";
import {
  type AdminActionState,
  registerInventoryMovement,
} from "@/app/admin/(protected)/actions";

const INITIAL_STATE: AdminActionState = { status: "idle", message: "" };

export type InventoryProductOption = {
  id: string;
  name: string;
};

export function InventoryMovementForm({
  products,
}: {
  products: InventoryProductOption[];
}) {
  const id = useId();
  const [eventType, setEventType] = useState("adjustment");
  const [state, formAction, pending] = useActionState(
    registerInventoryMovement,
    INITIAL_STATE,
  );

  return (
    <section
      className="rounded-2xl border border-cream-300 bg-cream-50 p-5 shadow-sm sm:p-6"
      aria-labelledby={`${id}-title`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-olive-100 text-olive-800">
          <PackagePlus className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 id={`${id}-title`} className="font-display text-2xl font-semibold text-ink-900">
            Registrar movimiento
          </h2>
          <p className="mt-1 text-sm leading-6 text-ink-700">
            Usa saldo inicial solo una vez por producto; después registra ajustes con motivo.
          </p>
        </div>
      </div>

      <form action={formAction} className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <div>
          <label htmlFor={`${id}-product`} className="text-sm font-semibold text-ink-900">
            Producto
          </label>
          <select
            id={`${id}-product`}
            name="productId"
            required
            disabled={pending}
            className="mt-2 min-h-11 w-full rounded-xl border border-cream-300 bg-white px-3 text-base text-ink-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">Selecciona un producto</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={`${id}-type`} className="text-sm font-semibold text-ink-900">
            Tipo
          </label>
          <select
            id={`${id}-type`}
            name="eventType"
            value={eventType}
            onChange={(event) => setEventType(event.target.value)}
            disabled={pending}
            className="mt-2 min-h-11 w-full rounded-xl border border-cream-300 bg-white px-3 text-base text-ink-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="adjustment">Ajuste</option>
            <option value="opening_balance">Saldo inicial</option>
          </select>
        </div>

        <div>
          <label htmlFor={`${id}-quantity`} className="text-sm font-semibold text-ink-900">
            Cantidad
          </label>
          <input
            id={`${id}-quantity`}
            name="quantityDelta"
            type="number"
            min={eventType === "opening_balance" ? 1 : -1000}
            max={1000}
            step={1}
            required
            disabled={pending}
            aria-describedby={`${id}-quantity-help`}
            className="mt-2 min-h-11 w-full rounded-xl border border-cream-300 bg-white px-4 text-base tabular-nums text-ink-900 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <p id={`${id}-quantity-help`} className="mt-1 text-xs leading-5 text-ink-500">
            {eventType === "opening_balance"
              ? "Debe ser positiva."
              : "Usa negativo para descontar unidades."}
          </p>
        </div>

        <div>
          <label htmlFor={`${id}-reason`} className="text-sm font-semibold text-ink-900">
            Motivo
          </label>
          <input
            id={`${id}-reason`}
            name="reason"
            type="text"
            minLength={4}
            maxLength={240}
            required
            disabled={pending}
            placeholder="Conteo físico, merma…"
            className="mt-2 min-h-11 w-full rounded-xl border border-cream-300 bg-white px-4 text-base text-ink-900 placeholder:text-ink-300 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        <div className="flex flex-col gap-2 lg:col-span-2 xl:col-span-4 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-wine-600 px-5 py-3 text-sm font-bold text-cream-50 transition-colors duration-200 hover:bg-wine-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {pending ? "Registrando…" : "Registrar movimiento"}
          </button>
          {state.message && (
            <p
              aria-live="polite"
              className={
                state.status === "success"
                  ? "text-sm leading-6 text-olive-700"
                  : "text-sm leading-6 text-wine-700"
              }
            >
              {state.message}
            </p>
          )}
        </div>
      </form>
    </section>
  );
}
