"use client";

import { useActionState, useId, useState } from "react";
import { LoaderCircle } from "lucide-react";
import {
  type AdminActionState,
  issueSandboxFiscalDocument,
  updateFiscalDocumentStatus,
} from "@/app/admin/(protected)/actions";

const INITIAL_STATE: AdminActionState = { status: "idle", message: "" };

export function FiscalDocumentActionForm({
  fiscalDocumentId,
  status,
  documentType,
  provider,
  sandboxEnabled,
}: {
  fiscalDocumentId: string;
  status: string;
  documentType: string;
  provider: string;
  sandboxEnabled: boolean;
}) {
  const id = useId();
  const [nextStatus, setNextStatus] = useState("issued");
  const [state, formAction, pending] = useActionState(
    updateFiscalDocumentStatus,
    INITIAL_STATE,
  );
  const [sandboxState, sandboxAction, sandboxPending] = useActionState(
    issueSandboxFiscalDocument,
    INITIAL_STATE,
  );
  const supported =
    ["manual", "sunat_sol"].includes(provider) &&
    ["boleta", "factura"].includes(documentType);

  if (!supported) {
    return (
      <p className="max-w-56 text-xs leading-5 text-ink-500">
        Sin acción manual para este proveedor o tipo de documento.
      </p>
    );
  }
  if (status !== "pending" && status !== "issued") {
    return (
      <p className="max-w-56 text-xs leading-5 text-ink-500">
        Este estado no admite más transiciones desde la cola manual.
      </p>
    );
  }

  const selectedStatus = status === "issued" ? "cancelled" : nextStatus;

  return (
    <div className="min-w-64 space-y-3">
      {sandboxEnabled && status === "pending" && ["boleta", "factura"].includes(documentType) && (
        <details className="rounded-lg border border-gold-500/40 bg-gold-500/10">
          <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-bold text-ink-900">
            Emitir prueba fiscal
          </summary>
          <form action={sandboxAction} className="space-y-3 border-t border-gold-500/30 p-3">
            <input type="hidden" name="fiscalDocumentId" value={fiscalDocumentId} />
            <p className="text-xs leading-5 text-ink-700">
              Solo funciona con pedidos internos creados usando el cupÃ³n de prueba y pago conciliado.
              Genera un documento marcado como <strong>sin validez ante SUNAT</strong>.
            </p>
            <label htmlFor={`${id}-sandbox`} className="text-xs font-bold text-ink-700">
              Escribe PRUEBA para confirmar
            </label>
            <input
              id={`${id}-sandbox`}
              name="confirmation"
              required
              maxLength={6}
              disabled={sandboxPending}
              className="mt-1 min-h-11 w-full rounded-lg border border-gold-500/40 bg-white px-3 text-base uppercase text-ink-900 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={sandboxPending}
              className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-ink-900 px-3 py-2 text-sm font-bold text-cream-50 transition-colors hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sandboxPending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {sandboxPending ? "Emitiendoâ€¦" : "Emitir comprobante de prueba"}
            </button>
            {sandboxState.message && (
              <p className={sandboxState.status === "success" ? "text-xs leading-5 text-olive-700" : "text-xs leading-5 text-wine-700"}>
                {sandboxState.message}
              </p>
            )}
          </form>
        </details>
      )}
      <details className="rounded-lg border border-cream-300 bg-cream-100">
      <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-bold text-olive-800">
        {status === "issued" ? "Registrar anulación" : "Registrar resultado"}
      </summary>
      <form action={formAction} className="space-y-3 border-t border-cream-300 p-3">
        <input type="hidden" name="fiscalDocumentId" value={fiscalDocumentId} />
        <input type="hidden" name="status" value={selectedStatus} />

        <p className="rounded-lg border border-gold-500/40 bg-gold-500/10 p-3 text-xs leading-5 text-ink-700">
          Esta acción solo registra un resultado ya obtenido en SEE-SOL o back office;
          no emite ni anula documentos ante SUNAT.
        </p>

        {status === "pending" && (
          <div>
            <label htmlFor={`${id}-result`} className="text-xs font-bold text-ink-700">
              Resultado
            </label>
            <select
              id={`${id}-result`}
              value={nextStatus}
              onChange={(event) => setNextStatus(event.target.value)}
              disabled={pending}
              className="mt-1 min-h-11 w-full rounded-lg border border-cream-300 bg-white px-3 text-base text-ink-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="issued">Emitido externamente</option>
              <option value="rejected">Rechazado externamente</option>
            </select>
          </div>
        )}

        {selectedStatus === "issued" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={`${id}-series`} className="text-xs font-bold text-ink-700">
                Serie
              </label>
              <input
                id={`${id}-series`}
                name="series"
                type="text"
                required
                maxLength={20}
                pattern="[A-Za-z0-9-]{1,20}"
                disabled={pending}
                placeholder={documentType === "factura" ? "F001" : "B001"}
                className="mt-1 min-h-11 w-full rounded-lg border border-cream-300 bg-white px-3 text-base uppercase text-ink-900 placeholder:text-ink-300 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
            <div>
              <label htmlFor={`${id}-number`} className="text-xs font-bold text-ink-700">
                Número
              </label>
              <input
                id={`${id}-number`}
                name="number"
                type="text"
                inputMode="numeric"
                required
                maxLength={20}
                pattern="[0-9]{1,20}"
                disabled={pending}
                placeholder="00000123"
                className="mt-1 min-h-11 w-full rounded-lg border border-cream-300 bg-white px-3 text-base tabular-nums text-ink-900 placeholder:text-ink-300 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
          </div>
        )}

        {(selectedStatus === "rejected" || selectedStatus === "cancelled") && (
          <div>
            <label htmlFor={`${id}-reason`} className="text-xs font-bold text-ink-700">
              {selectedStatus === "cancelled" ? "Motivo de anulación" : "Motivo de rechazo"}
            </label>
            <textarea
              id={`${id}-reason`}
              name="reason"
              required
              minLength={5}
              maxLength={500}
              rows={3}
              disabled={pending}
              className="mt-1 w-full rounded-lg border border-cream-300 bg-white p-3 text-base text-ink-900 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
        )}

        <div>
          <label htmlFor={`${id}-reference`} className="text-xs font-bold text-ink-700">
            Referencia externa {selectedStatus === "cancelled" ? "*" : "(opcional)"}
          </label>
          <input
            id={`${id}-reference`}
            name="externalReference"
            type="text"
            required={selectedStatus === "cancelled"}
            maxLength={200}
            disabled={pending}
            aria-describedby={`${id}-reference-help`}
            className="mt-1 min-h-11 w-full rounded-lg border border-cream-300 bg-white px-3 text-base text-ink-900 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <p id={`${id}-reference-help`} className="mt-1 text-xs leading-5 text-ink-500">
            Código o constancia entregada por el sistema externo, si corresponde.
          </p>
        </div>

        {selectedStatus === "cancelled" && (
          <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-wine-400 bg-wine-50 p-3 text-sm leading-6 text-wine-800">
            <input
              type="checkbox"
              name="confirmed"
              value="true"
              required
              disabled={pending}
              className="mt-1 h-4 w-4 shrink-0 accent-wine-600"
            />
            Confirmo que la anulación ya fue realizada en el sistema externo.
          </label>
        )}

        <button
          type="submit"
          disabled={pending}
          className={
            selectedStatus === "cancelled"
              ? "inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-wine-600 px-3 py-2 text-sm font-bold text-cream-50 transition-colors duration-200 hover:bg-wine-700 disabled:cursor-not-allowed disabled:opacity-60"
              : "inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-olive-700 px-3 py-2 text-sm font-bold text-cream-50 transition-colors duration-200 hover:bg-olive-800 disabled:cursor-not-allowed disabled:opacity-60"
          }
        >
          {pending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {pending ? "Guardando…" : "Guardar resultado"}
        </button>

        {state.message && (
          <p
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
      </details>
    </div>
  );
}
