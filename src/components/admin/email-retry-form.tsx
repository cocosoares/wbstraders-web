"use client";

import { useActionState } from "react";
import { LoaderCircle, RotateCcw } from "lucide-react";
import {
  retryEmailDelivery,
  type AdminActionState,
} from "@/app/admin/(protected)/actions";

const INITIAL_STATE: AdminActionState = { status: "idle", message: "" };

export function EmailRetryForm({ outboxId }: { outboxId: string }) {
  const [state, formAction, pending] = useActionState(
    retryEmailDelivery,
    INITIAL_STATE,
  );

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="outboxId" value={outboxId} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-wine-400 bg-wine-50 px-3 text-sm font-bold text-wine-800 transition-colors hover:bg-wine-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? (
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        )}
        {pending ? "Reintentando" : "Reintentar"}
      </button>
      {state.status !== "idle" && (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={
            state.status === "error"
              ? "max-w-56 text-xs leading-5 text-wine-700"
              : "max-w-56 text-xs leading-5 text-olive-800"
          }
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
