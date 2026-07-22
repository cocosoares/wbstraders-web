"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCheck,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Filter,
  Flag,
  LoaderCircle,
  LockKeyhole,
  MessageCircle,
  Search,
  Tag,
  UserRoundCheck,
  X,
} from "lucide-react";
import {
  manageCrmSavedReply,
  manageCrmTask,
  manageWhatsAppConversation,
  markCrmConversationRead,
  setCrmCustomerTag,
  updateCrmConversationPriority,
  type AdminActionState,
} from "@/app/admin/(protected)/actions";
import { formatAdminCurrency, formatAdminDate } from "@/components/admin/format";
import type {
  CrmConversationDetail,
  CrmInboxData,
  CrmInboxItem,
  CrmMessage,
  CrmPriority,
  CrmSavedReply,
  CrmTag,
  CrmTask,
} from "@/lib/crm/types";
import { crmScoreLabel } from "@/lib/crm/scoring";
import { CrmComposer } from "./crm-composer";
import { CrmRealtimeRefresh } from "./crm-realtime-refresh";

const INITIAL: AdminActionState = { status: "idle", message: "" };

type InboxFilter = "all" | "unread" | "human" | "bot" | "sla" | "closed";

export function CrmInboxWorkspace({
  data,
  products,
}: {
  data: CrmInboxData;
  products: Array<{ id: string; name: string }>;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [minimumPriority, setMinimumPriority] = useState(1);
  const selected = data.selected;

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es");
    return data.items.filter((item) => {
      const matchesText =
        !normalizedQuery ||
        [item.contactName, item.phone, item.preview, item.intent]
          .filter(Boolean)
          .some((value) => String(value).toLocaleLowerCase("es").includes(normalizedQuery));
      const matchesFilter =
        filter === "all" ||
        (filter === "unread" && item.unread) ||
        (filter === "human" && item.state === "human") ||
        (filter === "bot" && item.state === "bot") ||
        (filter === "sla" && item.slaBreached) ||
        (filter === "closed" && item.state === "closed");
      return matchesText && matchesFilter && item.priority >= minimumPriority;
    });
  }, [data.items, filter, minimumPriority, query]);

  return (
    <section className="overflow-hidden rounded-2xl border border-cream-300 bg-white shadow-sm">
      <CrmRealtimeRefresh />
      <div className="grid min-h-[720px] xl:grid-cols-[19rem_minmax(28rem,1fr)_21rem]">
        <aside className="border-b border-cream-300 bg-cream-50 xl:border-b-0 xl:border-r">
          <div className="space-y-3 border-b border-cream-300 p-4">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" aria-hidden="true" />
              <span className="sr-only">Buscar conversaciones</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nombre, teléfono o mensaje"
                className="min-h-11 w-full rounded-xl border border-cream-300 bg-white pl-9 pr-3 text-sm text-ink-900 placeholder:text-ink-500"
              />
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {([
                ["all", "Todas"],
                ["unread", "No leídas"],
                ["human", "Humano"],
                ["bot", "Bot"],
                ["sla", "SLA"],
                ["closed", "Cerradas"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${
                    filter === value
                      ? "border-olive-700 bg-olive-700 text-white"
                      : "border-cream-300 bg-white text-ink-700 hover:bg-cream-100"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-ink-600">
              <Filter className="h-3.5 w-3.5" aria-hidden="true" />
              Prioridad mínima
              <select
                value={minimumPriority}
                onChange={(event) => setMinimumPriority(Number(event.target.value))}
                className="ml-auto min-h-9 rounded-lg border border-cream-300 bg-white px-2 text-xs text-ink-800"
              >
                <option value={1}>Todas</option>
                <option value={2}>Normal</option>
                <option value={3}>Alta</option>
                <option value={4}>Urgente</option>
              </select>
            </label>
          </div>

          <div className="max-h-[640px] overflow-y-auto">
            {visibleItems.length ? (
              visibleItems.map((item) => <InboxRow key={item.id} item={item} selected={item.id === selected?.conversation.id} />)
            ) : (
              <div className="p-6 text-center text-sm leading-6 text-ink-600">
                No hay conversaciones que coincidan con estos filtros.
              </div>
            )}
          </div>
        </aside>

        <main className="flex min-w-0 flex-col border-b border-cream-300 xl:border-b-0 xl:border-r">
          {selected ? (
            <ConversationPanel detail={selected} savedReplies={data.savedReplies} products={products} />
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center">
              <div>
                <MessageCircle className="mx-auto h-10 w-10 text-olive-600" aria-hidden="true" />
                <h2 className="mt-3 font-display text-2xl font-semibold text-ink-900">Selecciona una conversación</h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-ink-600">Aquí verás el historial completo y podrás responder sin salir del CRM.</p>
              </div>
            </div>
          )}
        </main>

        <aside className="bg-cream-50">
          {selected ? <CustomerSidebar detail={selected} allTags={data.tags} /> : null}
          <SavedRepliesManager replies={data.savedReplies} />
        </aside>
      </div>
    </section>
  );
}

function InboxRow({ item, selected }: { item: CrmInboxItem; selected: boolean }) {
  return (
    <Link
      href={`/admin/conversaciones?conversation=${item.id}`}
      scroll={false}
      className={`block border-b border-cream-200 px-4 py-3 transition-colors ${selected ? "bg-olive-100" : "hover:bg-white"}`}
    >
      <div className="flex items-start gap-3">
        <div className="relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-wine-100 font-bold text-wine-800">
          {(item.contactName || item.phone).slice(0, 1).toUpperCase()}
          {item.unread ? <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-cream-50 bg-wine-600" /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-sm font-bold text-ink-900">{item.contactName || item.phone}</p>
            <time className="shrink-0 text-[11px] text-ink-500">{shortTime(item.lastMessageAt)}</time>
          </div>
          <p className={`mt-1 truncate text-xs ${item.unread ? "font-semibold text-ink-800" : "text-ink-600"}`}>
            {item.previewDirection === "outbound" ? "Tú: " : ""}{item.preview || "Sin texto"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <StatePill state={item.state} />
            <ScorePill score={item.score} />
            {item.slaBreached ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800">SLA vencido</span> : null}
            {item.priority >= 3 ? <Flag className={`h-3.5 w-3.5 ${item.priority === 4 ? "text-red-600" : "text-amber-600"}`} aria-label="Prioridad alta" /> : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

function ConversationPanel({
  detail,
  savedReplies,
  products,
}: {
  detail: CrmConversationDetail;
  savedReplies: CrmSavedReply[];
  products: Array<{ id: string; name: string }>;
}) {
  const conversation = detail.conversation;
  useEffect(() => {
    if (!conversation.unread) return;
    const form = new FormData();
    form.set("conversationId", conversation.id);
    void markCrmConversationRead(INITIAL, form);
  }, [conversation.id, conversation.unread]);

  const serviceWindowOpen = Boolean(
    conversation.lastInboundAt && Date.now() - Date.parse(conversation.lastInboundAt) < 24 * 60 * 60 * 1000,
  );

  return (
    <>
      <header className="border-b border-cream-300 bg-white px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold text-ink-900">{conversation.contactName || conversation.phone}</h2>
            <p className="mt-0.5 text-xs text-ink-500">+{conversation.phone} · {conversation.intent || "Intención por identificar"}</p>
          </div>
          <PriorityForm conversationId={conversation.id} priority={conversation.priority} />
          <ConversationActionForm conversation={conversation} />
        </div>
        {conversation.slaBreached ? (
          <p className="mt-2 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-800">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" /> El SLA de 10 minutos está vencido. Responde o asigna esta conversación.
          </p>
        ) : conversation.slaDueAt && !conversation.firstHumanResponseAt ? (
          <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-amber-700">
            <Clock3 className="h-4 w-4" aria-hidden="true" /> Respuesta humana comprometida antes de {shortTime(conversation.slaDueAt)}.
          </p>
        ) : null}
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto bg-[#f4efe6] p-4 sm:p-5">
        {detail.messages.map((message) => <MessageBubble key={message.id} message={message} />)}
        {!detail.messages.length ? <p className="text-center text-sm text-ink-500">Esta conversación todavía no tiene mensajes.</p> : null}
      </div>

      {!serviceWindowOpen ? (
        <div className="flex items-center gap-2 border-t border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900">
          <LockKeyhole className="h-4 w-4" aria-hidden="true" /> La ventana de WhatsApp está cerrada. Contacta por email o usa una plantilla oficial cuando YCloud esté activo.
        </div>
      ) : null}
      <CrmComposer
        conversationId={conversation.id}
        contactId={conversation.contactId}
        savedReplies={savedReplies}
        products={products}
        disabled={!serviceWindowOpen || conversation.state === "closed"}
      />
    </>
  );
}

function MessageBubble({ message }: { message: CrmMessage }) {
  const inbound = message.direction === "inbound";
  const image = message.attachment?.mimeType?.startsWith("image/");
  return (
    <div className={`flex ${inbound ? "justify-start" : "justify-end"}`}>
      <article className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm ${inbound ? "rounded-tl-sm bg-white" : "rounded-tr-sm bg-[#d9fdd3]"}`}>
        {message.attachment?.url ? (
          image ? (
            // Signed media URLs are short-lived and intentionally bypass image optimization.
            // eslint-disable-next-line @next/next/no-img-element
            <a href={message.attachment.url} target="_blank" rel="noreferrer"><img src={message.attachment.url} alt={message.attachment.fileName} className="mb-2 max-h-72 rounded-lg object-contain" /></a>
          ) : (
            <a href={message.attachment.url} target="_blank" rel="noreferrer" className="mb-2 flex items-center gap-2 rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-sm font-bold text-olive-800 hover:underline">
              <LockKeyhole className="h-4 w-4" aria-hidden="true" /> {message.attachment.fileName}
            </a>
          )
        ) : message.attachment ? (
          <p className="mb-2 rounded-lg bg-white/70 px-3 py-2 text-xs font-semibold text-ink-600">Archivo privado: {message.attachment.fileName}</p>
        ) : null}
        {message.body ? <p className="whitespace-pre-wrap text-sm leading-6 text-ink-900">{message.body}</p> : null}
        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-ink-500">
          <time>{shortTime(message.occurredAt)}</time>
          {!inbound ? message.deliveryStatus === "read" ? <CheckCheck className="h-3.5 w-3.5 text-blue-600" /> : <Check className="h-3.5 w-3.5" /> : null}
        </div>
      </article>
    </div>
  );
}

function CustomerSidebar({ detail, allTags }: { detail: CrmConversationDetail; allTags: CrmTag[] }) {
  const customer = detail.customer;
  return (
    <div className="border-b border-cream-300 p-4">
      <div className="flex items-center gap-2">
        <CircleUserRound className="h-5 w-5 text-olive-700" aria-hidden="true" />
        <h2 className="font-display text-xl font-semibold text-ink-900">Cliente 360°</h2>
      </div>
      {customer ? (
        <div className="mt-4 space-y-4">
          <div>
            <p className="font-bold text-ink-900">{customer.name || "Cliente sin nombre"}</p>
            <p className="mt-1 text-xs text-ink-600">{customer.email || "Correo pendiente"}</p>
            <p className="text-xs text-ink-600">+{customer.phone}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Score" value={`${customer.score} · ${crmScoreLabel(customer.scoreTier)}`} />
            <Stat label="Ciclo" value={lifecycleLabel(customer.lifecycleStage)} />
            <Stat label="Compras" value={String(customer.paidOrders)} />
            <Stat label="Gastado" value={formatAdminCurrency(customer.totalSpentCents, "PEN")} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Etiquetas</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {allTags.map((tag) => {
                const enabled = customer.tags.some((item) => item.id === tag.id && item.selected);
                return <CustomerTagToggle key={tag.id} customerId={customer.id} tag={tag} enabled={enabled} />;
              })}
            </div>
          </div>
          {Object.keys(customer.qualification).length ? (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Preferencias</p>
              <dl className="mt-2 space-y-1 text-xs text-ink-700">
                {Object.entries(customer.qualification).map(([key, value]) => <div key={key} className="flex justify-between gap-3"><dt className="capitalize text-ink-500">{qualificationLabel(key)}</dt><dd className="text-right font-semibold">{value}</dd></div>)}
              </dl>
            </div>
          ) : null}
          <Link href={`/admin/clientes/${customer.id}`} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-olive-700 px-3 text-sm font-bold text-white hover:bg-olive-800">
            Ver ficha completa <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-cream-400 bg-white p-4 text-sm leading-6 text-ink-600">
          <p className="font-bold text-ink-900">Contacto preliminar</p>
          <p className="mt-1">El saludo inicial no crea un cliente. La ficha aparecerá cuando exista intención de compra, checkout o atención humana.</p>
        </div>
      )}

      <TaskPanel detail={detail} />
    </div>
  );
}

function TaskPanel({ detail }: { detail: CrmConversationDetail }) {
  const [state, action, pending] = useActionState(manageCrmTask, INITIAL);
  const openTasks = detail.tasks.filter((task) => task.status === "planned");
  return (
    <div className="mt-5 border-t border-cream-300 pt-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Seguimientos</p>
        <span className="rounded-full bg-cream-200 px-2 py-0.5 text-[10px] font-bold text-ink-700">{openTasks.length} abiertos</span>
      </div>
      <div className="mt-2 space-y-2">
        {openTasks.slice(0, 4).map((task) => <TaskRow key={task.id} task={task} />)}
      </div>
      <details className="mt-3 rounded-lg border border-cream-300 bg-white">
        <summary className="cursor-pointer px-3 py-2 text-xs font-bold text-olive-800">Crear seguimiento asistido</summary>
        <form action={action} className="space-y-2 border-t border-cream-300 p-3">
          <input type="hidden" name="action" value="create" />
          <input type="hidden" name="conversationId" value={detail.conversation.id} />
          {detail.customer ? <input type="hidden" name="customerId" value={detail.customer.id} /> : null}
          <input name="subject" required maxLength={200} placeholder="Ej. Confirmar selección" className="min-h-10 w-full rounded-lg border border-cream-300 px-3 text-sm" />
          <input name="dueAt" type="datetime-local" required className="min-h-10 w-full rounded-lg border border-cream-300 px-3 text-sm" />
          <select name="priority" defaultValue="2" className="min-h-10 w-full rounded-lg border border-cream-300 px-3 text-sm"><option value="1">Baja</option><option value="2">Normal</option><option value="3">Alta</option><option value="4">Urgente</option></select>
          <textarea name="body" rows={2} maxLength={4000} placeholder="Sugerencia para la operadora" className="w-full rounded-lg border border-cream-300 p-3 text-sm" />
          <button disabled={pending} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-olive-700 px-3 text-xs font-bold text-white disabled:opacity-50">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null} Guardar tarea</button>
          {state.message ? <p className={`text-xs ${state.status === "error" ? "text-red-700" : "text-olive-700"}`}>{state.message}</p> : null}
        </form>
      </details>
    </div>
  );
}

function TaskRow({ task }: { task: CrmTask }) {
  const [state, action, pending] = useActionState(manageCrmTask, INITIAL);
  const overdue = Boolean(task.dueAt && Date.parse(task.dueAt) < Date.now());
  return (
    <form action={action} className={`rounded-lg border p-2.5 ${overdue ? "border-red-200 bg-red-50" : "border-cream-300 bg-white"}`}>
      <input type="hidden" name="activityId" value={task.id} /><input type="hidden" name="action" value="complete" />
      <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><p className="text-xs font-bold text-ink-900">{task.subject}</p><p className={`mt-1 text-[10px] ${overdue ? "font-bold text-red-700" : "text-ink-500"}`}>{task.dueAt ? formatAdminDate(task.dueAt) : "Sin fecha"}</p></div><button disabled={pending} title="Completar tarea" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-olive-300 text-olive-700 hover:bg-olive-100"><Check className="h-4 w-4" /></button></div>
      {state.status === "error" ? <p className="mt-1 text-[10px] text-red-700">{state.message}</p> : null}
    </form>
  );
}

function ConversationActionForm({ conversation }: { conversation: CrmInboxItem }) {
  const [state, action, pending] = useActionState(manageWhatsAppConversation, INITIAL);
  const nextAction = conversation.state === "closed" ? "reopen" : conversation.state === "bot" ? "take" : "resolve";
  const label = nextAction === "reopen" ? "Reabrir" : nextAction === "take" ? "Tomar" : "Cerrar";
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="conversationId" value={conversation.id} /><input type="hidden" name="action" value={nextAction} />
      <button disabled={pending} className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-bold ${nextAction === "resolve" ? "border border-cream-300 bg-white text-ink-700" : "bg-wine-700 text-white"}`}>
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : nextAction === "resolve" ? <X className="h-4 w-4" /> : <UserRoundCheck className="h-4 w-4" />} {label}
      </button>
      {state.status === "error" ? <span className="sr-only" aria-live="polite">{state.message}</span> : null}
    </form>
  );
}

function PriorityForm({ conversationId, priority }: { conversationId: string; priority: CrmPriority }) {
  const [state, action, pending] = useActionState(updateCrmConversationPriority, INITIAL);
  return (
    <form action={action}>
      <input type="hidden" name="conversationId" value={conversationId} />
      <label className="sr-only" htmlFor={`priority-${conversationId}`}>Prioridad</label>
      <select id={`priority-${conversationId}`} name="priority" defaultValue={priority} disabled={pending} onChange={(event) => event.currentTarget.form?.requestSubmit()} className="min-h-10 rounded-lg border border-cream-300 bg-white px-2 text-xs font-bold text-ink-700">
        <option value="1">Baja</option><option value="2">Normal</option><option value="3">Alta</option><option value="4">Urgente</option>
      </select>
      {state.status === "error" ? <span className="sr-only" aria-live="polite">{state.message}</span> : null}
    </form>
  );
}

function CustomerTagToggle({ customerId, tag, enabled }: { customerId: string; tag: CrmTag; enabled: boolean }) {
  const [state, action, pending] = useActionState(setCrmCustomerTag, INITIAL);
  return (
    <form action={action}>
      <input type="hidden" name="customerId" value={customerId} /><input type="hidden" name="tagId" value={tag.id} /><input type="hidden" name="enabled" value={enabled ? "false" : "true"} />
      <button disabled={pending} className={`inline-flex min-h-8 items-center gap-1 rounded-full border px-2.5 text-[11px] font-bold ${enabled ? "border-olive-500 bg-olive-100 text-olive-900" : "border-cream-300 bg-white text-ink-600"}`}><Tag className="h-3 w-3" />{tag.name}</button>
      {state.status === "error" ? <span className="sr-only">{state.message}</span> : null}
    </form>
  );
}

function SavedRepliesManager({ replies }: { replies: CrmSavedReply[] }) {
  const [state, action, pending] = useActionState(manageCrmSavedReply, INITIAL);
  return (
    <details className="p-4">
      <summary className="cursor-pointer text-xs font-bold uppercase tracking-wide text-ink-500">Administrar respuestas rápidas</summary>
      <div className="mt-3 space-y-2">
        {replies.map((reply) => <SavedReplyDelete key={reply.id} reply={reply} />)}
      </div>
      <form action={action} className="mt-3 space-y-2 rounded-lg border border-cream-300 bg-white p-3">
        <input type="hidden" name="action" value="create" />
        <input name="title" required maxLength={80} placeholder="Título" className="min-h-10 w-full rounded-lg border border-cream-300 px-3 text-sm" />
        <textarea name="body" required maxLength={4000} rows={3} placeholder="Mensaje reutilizable" className="w-full rounded-lg border border-cream-300 p-3 text-sm" />
        <select name="category" defaultValue="general" className="min-h-10 w-full rounded-lg border border-cream-300 px-3 text-sm"><option value="general">General</option><option value="sales">Ventas</option><option value="delivery">Entrega</option><option value="support">Soporte</option><option value="horeca">HORECA</option></select>
        <button disabled={pending} className="min-h-10 w-full rounded-lg bg-olive-700 text-xs font-bold text-white disabled:opacity-50">Crear respuesta</button>
        {state.message ? <p className={`text-xs ${state.status === "error" ? "text-red-700" : "text-olive-700"}`}>{state.message}</p> : null}
      </form>
    </details>
  );
}

function SavedReplyDelete({ reply }: { reply: CrmSavedReply }) {
  const [state, action, pending] = useActionState(manageCrmSavedReply, INITIAL);
  return (
    <form action={action} className="flex items-center gap-2 rounded-lg border border-cream-300 bg-white p-2">
      <input type="hidden" name="action" value="delete" /><input type="hidden" name="replyId" value={reply.id} />
      <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-ink-800">{reply.title}</p><p className="truncate text-[10px] text-ink-500">{reply.body}</p></div>
      <button disabled={pending} title="Eliminar" className="flex h-8 w-8 items-center justify-center rounded-full text-red-700 hover:bg-red-50"><X className="h-3.5 w-3.5" /></button>
      {state.status === "error" ? <span className="sr-only">{state.message}</span> : null}
    </form>
  );
}

function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-cream-300 bg-white p-2.5"><p className="text-[10px] font-bold uppercase tracking-wide text-ink-500">{label}</p><p className="mt-1 truncate text-xs font-bold text-ink-900">{value}</p></div>; }
function StatePill({ state }: { state: CrmInboxItem["state"] }) { const labels = { bot: "Bot", human: "Humano", closed: "Cerrada" }; return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${state === "human" ? "bg-blue-100 text-blue-800" : state === "closed" ? "bg-cream-300 text-ink-600" : "bg-olive-100 text-olive-800"}`}>{labels[state]}</span>; }
function ScorePill({ score }: { score: number }) { return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${score >= 50 ? "bg-red-100 text-red-800" : score >= 20 ? "bg-amber-100 text-amber-800" : "bg-cream-200 text-ink-600"}`}>{score >= 50 ? "Caliente" : score >= 20 ? "Interesado" : "Explorando"} · {score}</span>; }
function shortTime(value: string) { if (!value) return ""; return new Intl.DateTimeFormat("es-PE", { hour: "2-digit", minute: "2-digit", day: Date.now() - Date.parse(value) > 86_400_000 ? "2-digit" : undefined, month: Date.now() - Date.parse(value) > 86_400_000 ? "short" : undefined, timeZone: "America/Lima" }).format(new Date(value)); }
function lifecycleLabel(value: string) { return ({ prospect: "Prospecto", engaged: "Interesado", customer: "Nuevo", repeat: "Recurrente", vip: "VIP", inactive: "Inactivo", horeca: "HORECA" } as Record<string, string>)[value] || value; }
function qualificationLabel(key: string) { return ({ occasion: "Ocasión", preference: "Estilo", format: "Formato", budget: "Presupuesto", need: "Necesidad" } as Record<string, string>)[key] || key.replaceAll("_", " "); }
