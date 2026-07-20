"use client";

import { useActionState, useId } from "react";
import { LoaderCircle, Send } from "lucide-react";
import {
  type AdminActionState,
  queueWhatsAppReply,
} from "@/app/admin/(protected)/actions";

const INITIAL_STATE: AdminActionState = { status: "idle", message: "" };

export function WhatsAppReplyForm({
  conversationId,
  contactId,
  disabled,
}: {
  conversationId: string;
  contactId: string;
  disabled: boolean;
}) {
  const messageId = useId();
  const [state, formAction, pending] = useActionState(queueWhatsAppReply, INITIAL_STATE);

  return (
    <form action={formAction} className="mt-3 space-y-2">
      <input type="hidden" name="conversationId" value={conversationId} />
      <input type="hidden" name="contactId" value={contactId} />
      <label htmlFor={`${messageId}-body`} className="sr-only">
        Respuesta de WhatsApp
      </label>
      <textarea
        id={`${messageId}-body`}
        name="body"
        rows={3}
        maxLength={4000}
        disabled={disabled || pending}
        placeholder={
          disabled
            ? "La ventana de atenciÃ³n de 24 horas cerrÃ³."
            : "Escribe una respuesta clara y Ãºtilâ€¦"
        }
        className="w-full rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-500 disabled:cursor-not-allowed disabled:bg-cream-100"
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs leading-5 text-ink-500">
          {disabled
            ? "Para reabrir contacto, usa una plantilla aprobada desde WhatsApp Business."
            : "Solo se envÃ­a dentro de la ventana de servicio de WhatsApp."}
        </p>
        <button
          type="submit"
          disabled={disabled || pending}
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-olive-700 px-3 py-2 text-sm font-bold text-cream-50 hover:bg-olive-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
          {pending ? "Encolandoâ€¦" : "Responder"}
        </button>
      </div>
      {state.message && (
        <p
          id={messageId}
          aria-live="polite"
          className={state.status === "success" ? "text-xs text-olive-700" : "text-xs text-wine-700"}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
