import {
  Bot,
  CheckCircle2,
  Clock3,
  MessageCircleMore,
  UserRoundCheck,
} from "lucide-react";
import {
  type AdminWhatsAppConversation,
  type DataResult,
} from "@/components/admin/admin-data";
import { AdminEmptyState } from "@/components/admin/empty-state";
import { WhatsAppReplyForm } from "@/components/admin/whatsapp-reply-form";
import { WhatsAppConversationActions } from "@/components/admin/whatsapp-conversation-actions";

const capabilities = [
  {
    icon: Bot,
    title: "Orientar antes de vender",
    description:
      "El asistente identifica la ocasión, el presupuesto y las preferencias para recomendar vinos o packs del catálogo.",
  },
  {
    icon: UserRoundCheck,
    title: "Derivar con contexto",
    description:
      "Las conversaciones sensibles, corporativas o complejas llegan a una persona con su contexto comercial.",
  },
  {
    icon: CheckCircle2,
    title: "Convertir con trazabilidad",
    description:
      "Cada recomendación enlaza al checkout seguro y atribuye la venta sin pedir pagos en el chat.",
  },
] as const;

const activationSteps = [
  "Conectar un número verificado a WhatsApp Business Platform.",
  "Aprobar las plantillas de servicio y consentimiento comercial.",
  "Vincular el webhook y activar primero la atención humana de prueba.",
] as const;

export function WhatsAppInboxPreview({
  inbox,
}: {
  inbox: DataResult<AdminWhatsAppConversation[]>;
}) {
  const hasConversations = inbox.state === "ready" && inbox.data.length > 0;

  return (
    <div className="space-y-6">
      <section
        aria-labelledby="whatsapp-inbox-status"
        className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.8fr)]"
      >
        {hasConversations ? (
          <section className="space-y-3" aria-label="Conversaciones activas de WhatsApp">
            {inbox.data.map((conversation) => (
              <ConversationCard key={conversation.id} conversation={conversation} />
            ))}
          </section>
        ) : (
          <AdminEmptyState
            icon={MessageCircleMore}
            kind={inbox.state === "error" ? "error" : inbox.state === "demo" ? "demo" : "empty"}
            title={
              inbox.state === "error"
                ? "No pudimos cargar el inbox de WhatsApp"
                : inbox.state === "ready"
                  ? "Aún no hay conversaciones activas"
                  : "El inbox de WhatsApp está listo para conectarse"
            }
            description={
              inbox.state === "ready"
                ? "Los mensajes y derivaciones aparecerán aquí cuando el número oficial reciba su primera conversación."
                : inbox.message
            }
          />
        )}

        <aside className="rounded-2xl border border-cream-300 bg-cream-50 p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-500/15 text-gold-600">
              <Clock3 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-olive-700">Siguiente etapa</p>
              <h2 id="whatsapp-inbox-status" className="mt-1 font-display text-2xl font-semibold text-ink-900">
                {hasConversations ? "Gestionar el servicio" : "Activar el canal"}
              </h2>
            </div>
          </div>
          <ol className="mt-5 space-y-4">
            {activationSteps.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm leading-6 text-ink-700">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-olive-100 text-xs font-bold tabular-nums text-olive-900">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </aside>
      </section>

      <section aria-labelledby="whatsapp-capabilities-title">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-olive-700">Diseñado para vender y atender</p>
            <h2 id="whatsapp-capabilities-title" className="mt-1 font-display text-2xl font-semibold text-ink-900">
              Lo que resuelve este inbox
            </h2>
          </div>
          <p className="text-sm text-ink-500">Sin datos de demostración ni mensajes simulados.</p>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {capabilities.map(({ icon: Icon, title, description }) => (
            <article key={title} className="rounded-2xl border border-cream-300 bg-cream-50 p-5 shadow-sm">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-olive-100 text-olive-800">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-bold text-ink-900">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-700">{description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function ConversationCard({ conversation }: { conversation: AdminWhatsAppConversation }) {
  const canReply = isServiceWindowOpen(conversation.lastInboundAt);
  const stateLabel =
    conversation.state === "human"
      ? "Atención humana"
      : conversation.state === "bot"
        ? "Sommelier"
        : "Cerrada";
  const intentLabel = conversation.handoff
    ? `Derivada: ${conversation.handoff.reason}`
    : conversation.intent || "Consulta general";

  return (
    <article className="rounded-2xl border border-cream-300 bg-cream-50 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-ink-900">
            {conversation.contactName || `+${conversation.phone}`}
          </h2>
          <p className="mt-1 text-sm text-ink-600">+{conversation.phone}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-olive-100 px-2.5 py-1 text-xs font-bold text-olive-800">
            {stateLabel}
          </span>
          <span className="rounded-full bg-cream-200 px-2.5 py-1 text-xs font-bold text-ink-700">
            {conversation.ageVerified ? "+18 confirmado" : "+18 pendiente"}
          </span>
        </div>
      </div>
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-ink-500">Motivo</dt>
          <dd className="font-medium text-ink-800">{intentLabel}</dd>
        </div>
        <div>
          <dt className="text-ink-500">Último mensaje</dt>
          <dd className="font-medium text-ink-800">{formatInboxDate(conversation.lastMessageAt)}</dd>
        </div>
      </dl>
      <WhatsAppConversationActions conversationId={conversation.id} state={conversation.state} />
      <WhatsAppReplyForm
        conversationId={conversation.id}
        contactId={conversation.contactId}
        disabled={!canReply}
      />
    </article>
  );
}

function isServiceWindowOpen(lastInboundAt: string | null) {
  if (!lastInboundAt) return false;
  const timestamp = new Date(lastInboundAt).getTime();
  return Number.isFinite(timestamp) && Date.now() - timestamp < 23 * 60 * 60 * 1000 + 45 * 60 * 1000;
}

function formatInboxDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Lima",
  }).format(date);
}
