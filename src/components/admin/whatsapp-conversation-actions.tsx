"use client";

import { useActionState, useId } from "react";
import { CheckCircle2, LoaderCircle, UserRoundCheck } from "lucide-react";
import {
  type AdminActionState,
  manageWhatsAppConversation,
} from "@/app/admin/(protected)/actions";

const INITIAL_STATE: AdminActionState = { status: "idle", message: "" };

export function WhatsAppConversationActions({
  conversationId,
  state,
}: {
  conversationId: string;
  state: "bot" | "human" | "closed";
}) {
  const messageId = useId();
  const [takeState, takeAction, taking] = useActionState(
    manageWhatsAppConversation,
    INITIAL_STATE,
  );
  const [resolveState, resolveAction, resolving] = useActionState(
    manageWhatsAppConversation,
    INITIAL_STATE,
  );
  const isClosed = state === "closed";

  return (
    <div className="mt-4 flex flex-wrap items-start gap-2">
      {!isClosed && (
        <form action={takeAction}>
          <input type="hidden" name="conversationId" value={conversationId} />
          <input type="hidden" name="action" value="take" />
          <button
            type="submit"
            disabled={taking}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-olive-300 bg-white px-3 py-2 text-sm font-bold text-olive-800 hover:bg-olive-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {taking ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <UserRoundCheck className="h-4 w-4" aria-hidden="true" />}
            {taking ? "Tomando…" : "Tomar conversación"}
          </button>
        </form>
      )}
      {!isClosed && (
        <form action={resolveAction} className="flex min-w-56 flex-1 flex-wrap items-start gap-2">
          <input type="hidden" name="conversationId" value={conversationId} />
          <input type="hidden" name="action" value="resolve" />
          <label htmlFor={`${messageId}-resolution`} className="sr-only">
            Nota de cierre
          </label>
          <input
            id={`${messageId}-resolution`}
            name="resolutionNote"
            maxLength={2000}
            disabled={resolving}
            placeholder="Nota de cierre (opcional)"
            className="min-h-10 min-w-44 flex-1 rounded-lg border border-cream-300 bg-white px-3 text-sm text-ink-900 placeholder:text-ink-500 disabled:cursor-not-allowed disabled:bg-cream-100"
          />
          <button
            type="submit"
            disabled={resolving}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm font-bold text-ink-700 hover:bg-cream-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {resolving ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
            {resolving ? "Cerrando…" : "Cerrar"}
          </button>
        </form>
      )}
      {(takeState.message || resolveState.message) && (
        <p
          aria-live="polite"
          className={
            (takeState.status === "error" || resolveState.status === "error")
              ? "w-full text-xs text-wine-700"
              : "w-full text-xs text-olive-700"
          }
        >
          {takeState.message || resolveState.message}
        </p>
      )}
    </div>
  );
}
