"use client";

import { useActionState, useId, useState } from "react";
import { FileText, LoaderCircle, Send, Wine } from "lucide-react";
import { queueWhatsAppReply, type AdminActionState } from "@/app/admin/(protected)/actions";
import type { CrmSavedReply } from "@/lib/crm/types";

const INITIAL: AdminActionState = { status: "idle", message: "" };

export function CrmComposer({
  conversationId,
  contactId,
  savedReplies,
  products,
  disabled,
}: {
  conversationId: string;
  contactId: string;
  savedReplies: CrmSavedReply[];
  products: Array<{ id: string; name: string }>;
  disabled: boolean;
}) {
  const id = useId();
  const [body, setBody] = useState("");
  const [mode, setMode] = useState<"none" | "catalog" | "product" | "upload">("none");
  const [state, action, pending] = useActionState(queueWhatsAppReply, INITIAL);

  return (
    <form action={action} className="border-t border-cream-300 bg-cream-50 p-4">
      <input type="hidden" name="conversationId" value={conversationId} />
      <input type="hidden" name="contactId" value={contactId} />
      <input type="hidden" name="attachmentMode" value={mode} />
      <div className="mb-2 flex flex-wrap gap-2">
        <select
          aria-label="Respuesta rápida"
          defaultValue=""
          onChange={(event) => {
            const reply = savedReplies.find((item) => item.id === event.target.value);
            if (reply) setBody(reply.body);
          }}
          className="min-h-9 rounded-lg border border-cream-300 bg-white px-2 text-xs font-semibold text-ink-700"
        >
          <option value="">Respuesta rápida</option>
          {savedReplies.map((reply) => <option key={reply.id} value={reply.id}>{reply.title}</option>)}
        </select>
        <button type="button" onClick={() => setMode(mode === "product" ? "none" : "product")} className={toolClass(mode === "product")}>
          <Wine className="h-4 w-4" aria-hidden="true" /> Producto
        </button>
        <button type="button" onClick={() => setMode(mode === "catalog" ? "none" : "catalog")} className={toolClass(mode === "catalog")}>
          <FileText className="h-4 w-4" aria-hidden="true" /> Catálogo
        </button>
        <button type="button" onClick={() => setMode(mode === "upload" ? "none" : "upload")} className={toolClass(mode === "upload")}>
          Adjuntar archivo
        </button>
      </div>

      {mode === "product" && (
        <select name="productId" required className="mb-2 min-h-10 w-full rounded-lg border border-cream-300 bg-white px-3 text-sm text-ink-800">
          <option value="">Selecciona un producto</option>
          {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
        </select>
      )}
      {mode === "upload" && (
        <div className="mb-2 rounded-lg border border-dashed border-cream-400 bg-white p-3">
          <input id={`${id}-file`} name="attachment" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required className="block w-full text-xs text-ink-700 file:mr-3 file:rounded-md file:border-0 file:bg-olive-100 file:px-3 file:py-2 file:font-bold file:text-olive-800" />
          <p className="mt-1 text-xs text-ink-500">JPG, PNG, WebP o PDF · máximo 10 MB.</p>
        </div>
      )}

      <div className="flex items-end gap-2">
        <label htmlFor={`${id}-message`} className="sr-only">Mensaje</label>
        <textarea
          id={`${id}-message`}
          name="body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={3}
          maxLength={4000}
          disabled={disabled || pending}
          placeholder={disabled ? "La ventana de atención de 24 horas está cerrada." : "Escribe una respuesta clara y útil…"}
          className="min-h-20 flex-1 resize-none rounded-xl border border-cream-300 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-500 disabled:bg-cream-100"
        />
        <button type="submit" disabled={disabled || pending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-olive-700 px-4 text-sm font-bold text-cream-50 hover:bg-olive-800 disabled:cursor-not-allowed disabled:opacity-50">
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
          {pending ? "Enviando" : "Enviar"}
        </button>
      </div>
      {state.message && <p aria-live="polite" className={`mt-2 text-xs ${state.status === "error" ? "text-wine-700" : "text-olive-700"}`}>{state.message}</p>}
    </form>
  );
}

function toolClass(active: boolean) {
  return `inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-bold ${active ? "border-olive-500 bg-olive-100 text-olive-900" : "border-cream-300 bg-white text-ink-700 hover:bg-cream-100"}`;
}
