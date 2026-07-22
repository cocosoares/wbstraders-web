"use client";

import { useActionState, useId, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { type AdminActionState, updateOpportunity } from "@/app/admin/(protected)/actions";

const INITIAL_STATE: AdminActionState = { status: "idle", message: "" };

const D2C_STAGES = [
  ["lead", "Lead"],
  ["qualified", "Calificada"],
  ["recommendation", "Recomendación"],
  ["checkout", "Checkout"],
  ["won", "Ganada"],
  ["lost", "Perdida"],
] as const;

const HORECA_STAGES = [
  ["lead", "Lead"],
  ["qualified", "Calificada"],
  ["tasting", "Degustación"],
  ["proposal", "Propuesta"],
  ["negotiation", "Negociación"],
  ["won", "Ganada"],
  ["lost", "Perdida"],
] as const;

export function OpportunityActionForm({
  opportunityId,
  stage: initialStage,
  segment,
}: {
  opportunityId: string;
  stage: string;
  segment?: string;
}) {
  const id = useId();
  const [stage, setStage] = useState(initialStage);
  const [state, formAction, pending] = useActionState(updateOpportunity, INITIAL_STATE);
  const stages = segment === "d2c" ? D2C_STAGES : HORECA_STAGES;

  return (
    <details className="min-w-52 rounded-lg border border-cream-300 bg-cream-100">
      <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-bold text-olive-800">
        Gestionar oportunidad
      </summary>
      <form action={formAction} className="space-y-3 border-t border-cream-300 p-3">
        <input type="hidden" name="opportunityId" value={opportunityId} />
        <div>
          <label htmlFor={`${id}-stage`} className="text-xs font-bold text-ink-700">Etapa</label>
          <select
            id={`${id}-stage`}
            name="stage"
            value={stage}
            onChange={(event) => setStage(event.target.value)}
            disabled={pending}
            className="mt-1 min-h-11 w-full rounded-lg border border-cream-300 bg-white px-3 text-sm text-ink-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {stages.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>

        {stage === "lost" ? (
          <div>
            <label htmlFor={`${id}-reason`} className="text-xs font-bold text-ink-700">Motivo de pérdida</label>
            <textarea id={`${id}-reason`} name="lostReason" required maxLength={240} rows={3} disabled={pending} className="mt-1 w-full rounded-lg border border-cream-300 bg-white p-3 text-base text-ink-900 disabled:cursor-not-allowed disabled:opacity-60" />
          </div>
        ) : null}

        <button type="submit" disabled={pending} className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-olive-700 px-3 py-2 text-sm font-bold text-cream-50 hover:bg-olive-800 disabled:cursor-not-allowed disabled:opacity-60">
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {pending ? "Guardando…" : "Guardar etapa"}
        </button>
        {state.message ? <p aria-live="polite" className={state.status === "success" ? "text-xs leading-5 text-olive-700" : "text-xs leading-5 text-wine-700"}>{state.message}</p> : null}
      </form>
    </details>
  );
}
