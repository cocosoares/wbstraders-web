import {
  BadgeCheck,
  Ban,
  CheckCircle2,
  Clock3,
  Mail,
  Send,
  Settings2,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import { AdminEmptyState } from "@/components/admin/empty-state";
import { EmailRetryForm } from "@/components/admin/email-retry-form";
import { MetricCard } from "@/components/admin/metric-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { AdminTable, type AdminTableRow } from "@/components/admin/admin-table";
import {
  loadEmailDashboard,
  type AdminEmailDashboard,
} from "@/components/admin/admin-data";
import { formatAdminDate } from "@/components/admin/format";
import {
  EMAIL_TEMPLATE_PREVIEWS,
  emailDeliveryLabel,
  emailEventLabel,
  emailKindLabel,
} from "@/lib/email/admin";

type EmailPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const STATE_OPTIONS = [
  ["all", "Todos los estados"],
  ["pending", "Pendientes"],
  ["processing", "Procesando"],
  ["sent", "Enviados"],
  ["failed", "Fallidos"],
  ["dead", "Intentos agotados"],
  ["suppressed", "Bloqueados"],
] as const;

export default async function AdminEmailsPage({ searchParams }: EmailPageProps) {
  const params = await searchParams;
  const state = firstParam(params.estado) || "all";
  const query = firstParam(params.buscar) || "";
  const result = await loadEmailDashboard({ state, query });

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-olive-700">
          Comunicación y servicio
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink-900 sm:text-4xl">
          Emails
        </h1>
        <p className="mt-2 max-w-3xl text-base leading-7 text-ink-700">
          Controla los correos automáticos de pedidos y reclamos, revisa su entrega y
          recupera fallos sin salir de WBStraders.
        </p>
      </header>

      {result.state !== "ready" ? (
        <AdminEmptyState
          icon={Mail}
          kind={result.state}
          title={
            result.state === "demo"
              ? "Conecta Supabase para administrar emails"
              : "No pudimos cargar la zona de emails"
          }
          description={result.message}
        />
      ) : (
        <EmailDashboard data={result.data} state={state} query={query} />
      )}
    </div>
  );
}

function EmailDashboard({
  data,
  state,
  query,
}: {
  data: AdminEmailDashboard;
  state: string;
  query: string;
}) {
  const outboxRows: AdminTableRow[] = data.outbox.map((item) => ({
    id: item.id,
    cells: [
      {
        label: "Email",
        value: (
          <div>
            <p className="font-semibold text-ink-900">{emailKindLabel(item.kind)}</p>
            <p className="mt-1 text-xs text-ink-500">{item.kind}</p>
          </div>
        ),
      },
      {
        label: "Destino",
        value: item.recipientEmail ? (
          <span className="break-all">{item.recipientEmail}</span>
        ) : (
          <span className="text-ink-500">Correo operativo</span>
        ),
      },
      {
        label: "Estado",
        value: (
          <div className="space-y-2">
            <StatusBadge status={item.state} />
            {emailDeliveryLabel(item.deliveryStatus) && (
              <p className="text-xs font-medium text-ink-500">
                Resend: {emailDeliveryLabel(item.deliveryStatus)}
              </p>
            )}
            {item.lastError && (
              <p className="max-w-64 text-xs leading-5 text-wine-700">
                {friendlyEmailError(item.lastError)}
              </p>
            )}
          </div>
        ),
      },
      {
        label: "Intentos",
        value: (
          <span className="tabular-nums">
            {item.attempts} de {item.maxAttempts}
          </span>
        ),
      },
      {
        label: "Fecha",
        value: (
          <div>
            <p>{formatAdminDate(item.createdAt)}</p>
            {item.deliveredAt && (
              <p className="mt-1 text-xs text-olive-800">
                Entregado {formatAdminDate(item.deliveredAt)}
              </p>
            )}
          </div>
        ),
      },
      {
        label: "Acción",
        value:
          item.state === "failed" || item.state === "dead" ? (
            <EmailRetryForm outboxId={item.id} />
          ) : (
            <span className="text-xs text-ink-500">Sin acción pendiente</span>
          ),
      },
    ],
  }));

  const eventRows: AdminTableRow[] = data.events.map((event) => ({
    id: event.id,
    cells: [
      {
        label: "Evento",
        value: (
          <div className="space-y-2">
            <StatusBadge status={event.eventType.replace("email.", "")} />
            <p className="text-xs text-ink-500">{emailEventLabel(event.eventType)}</p>
          </div>
        ),
      },
      {
        label: "Destinatario",
        value: event.recipientEmail ? (
          <span className="break-all">{event.recipientEmail}</span>
        ) : (
          <span className="text-ink-500">No informado</span>
        ),
      },
      {
        label: "Referencia",
        value: event.providerEmailId ? (
          <span className="break-all font-mono text-xs">{event.providerEmailId}</span>
        ) : (
          <span className="text-ink-500">Evento de contacto</span>
        ),
      },
      { label: "Recibido", value: formatAdminDate(event.receivedAt) },
    ],
  }));

  const suppressionRows: AdminTableRow[] = data.suppressions.map((suppression) => ({
    id: suppression.email,
    cells: [
      { label: "Correo", value: <span className="break-all">{suppression.email}</span> },
      { label: "Motivo", value: emailEventLabel(suppression.reason) },
      { label: "Estado", value: <StatusBadge status="suppressed" /> },
      { label: "Actualizado", value: formatAdminDate(suppression.updatedAt) },
    ],
  }));

  return (
    <>
      <SystemNotice data={data} />

      <nav aria-label="Secciones de email" className="flex flex-wrap gap-2">
        {[
          ["#cola", "Cola y entregas"],
          ["#actividad", "Actividad de Resend"],
          ["#plantillas", "Plantillas"],
          ["#bloqueos", "Bloqueos"],
        ].map(([href, label]) => (
          <a
            key={href}
            href={href}
            className="inline-flex min-h-11 items-center rounded-full border border-cream-300 bg-cream-50 px-4 text-sm font-bold text-ink-700 transition-colors hover:border-olive-400 hover:bg-olive-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-700 focus-visible:ring-offset-2"
          >
            {label}
          </a>
        ))}
      </nav>

      <section aria-labelledby="email-metrics-title">
        <h2 id="email-metrics-title" className="sr-only">
          Indicadores de email de hoy
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Enviados hoy"
            value={String(data.sentToday)}
            detail="Aceptados por Resend"
            icon={Send}
          />
          <MetricCard
            label="Entregados hoy"
            value={String(data.deliveredToday)}
            detail="Recibidos por el servidor del cliente"
            icon={BadgeCheck}
          />
          <MetricCard
            label="Requieren atención"
            value={String(data.attentionRequired)}
            detail="Fallidos o con intentos agotados"
            icon={TriangleAlert}
          />
          <MetricCard
            label="Destinatarios bloqueados"
            value={String(data.activeSuppressions)}
            detail="Rebotes, spam o supresiones activas"
            icon={Ban}
          />
        </div>
      </section>

      <section id="cola" aria-labelledby="outbox-title" className="scroll-mt-6 space-y-5">
        <SectionHeading
          eyebrow="Operación"
          title="Cola y entregas"
          description="Cada evento comercial se guarda antes de enviarse. Los fallidos se reintentan automáticamente y también puedes recuperarlos aquí."
        />

        <form
          method="get"
          className="grid gap-3 rounded-2xl border border-cream-300 bg-cream-50 p-4 shadow-sm sm:grid-cols-[minmax(12rem,1fr)_minmax(14rem,2fr)_auto_auto] sm:items-end"
        >
          <label className="space-y-1.5 text-sm font-semibold text-ink-900">
            Estado
            <select
              name="estado"
              defaultValue={state}
              className="min-h-11 w-full rounded-lg border border-cream-300 bg-white px-3 text-base text-ink-900 outline-none focus:border-olive-600 focus:ring-2 focus:ring-olive-600/20"
            >
              {STATE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-sm font-semibold text-ink-900">
            Buscar
            <input
              type="search"
              name="buscar"
              defaultValue={query}
              maxLength={120}
              placeholder="Correo, tipo o error"
              className="min-h-11 w-full rounded-lg border border-cream-300 bg-white px-3 text-base text-ink-900 outline-none placeholder:text-ink-300 focus:border-olive-600 focus:ring-2 focus:ring-olive-600/20"
            />
          </label>
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-ink-900 px-4 text-sm font-bold text-cream-50 transition-colors hover:bg-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-900 focus-visible:ring-offset-2"
          >
            Aplicar
          </button>
          <a
            href="/admin/emails#cola"
            className="inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-bold text-wine-700 transition-colors hover:bg-wine-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine-600 focus-visible:ring-offset-2"
          >
            Limpiar
          </a>
        </form>

        {data.outbox.length > 0 ? (
          <AdminTable
            caption="Correos automáticos, ordenados desde el más reciente"
            headers={["Email", "Destino", "Estado", "Intentos", "Fecha", "Acción"]}
            rows={outboxRows}
          />
        ) : (
          <AdminEmptyState
            icon={CheckCircle2}
            kind="empty"
            title="No hay correos con estos filtros"
            description="La cola está limpia o no encontramos coincidencias. Cambia los filtros para consultar otra actividad."
          />
        )}
      </section>

      <section id="actividad" aria-labelledby="activity-title" className="scroll-mt-6 space-y-5">
        <SectionHeading
          eyebrow="Webhook"
          title="Actividad de Resend"
          description="Eventos firmados que confirman envío, entrega, apertura, rebote o bloqueo."
        />
        {eventRows.length > 0 ? (
          <AdminTable
            caption="Eventos recientes recibidos desde Resend"
            headers={["Evento", "Destinatario", "Referencia", "Recibido"]}
            rows={eventRows}
          />
        ) : (
          <AdminEmptyState
            icon={Clock3}
            kind="empty"
            title="Aún no hay eventos de Resend"
            description="Los eventos aparecerán cuando se envíe el primer correo automático."
          />
        )}
      </section>

      <section id="plantillas" aria-labelledby="templates-title" className="scroll-mt-6 space-y-5">
        <SectionHeading
          eyebrow="Contenido transaccional"
          title="Plantillas activas"
          description="Un correo, un objetivo: cada mensaje corresponde a un momento concreto de la experiencia del cliente."
        />
        <div className="grid gap-4 lg:grid-cols-2">
          {EMAIL_TEMPLATE_PREVIEWS.map((template) => (
            <details
              key={template.kind}
              className="group rounded-2xl border border-cream-300 bg-cream-50 p-5 shadow-sm open:border-olive-400"
            >
              <summary className="flex min-h-11 cursor-pointer list-none items-start justify-between gap-4 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-700 focus-visible:ring-offset-2">
                <span>
                  <span className="block text-sm font-bold text-ink-900">
                    {emailKindLabel(template.kind)}
                  </span>
                  <span className="mt-1 block text-xs text-ink-500">{template.audience}</span>
                </span>
                <span className="rounded-full bg-olive-100 px-2.5 py-1 text-xs font-bold text-olive-900 group-open:bg-olive-700 group-open:text-cream-50">
                  Ver detalle
                </span>
              </summary>
              <dl className="mt-4 space-y-3 border-t border-cream-300 pt-4 text-sm leading-6">
                <TemplateDetail label="Asunto" value={template.subject} />
                <TemplateDetail label="Disparador" value={template.trigger} />
                <TemplateDetail label="Objetivo" value={template.purpose} />
              </dl>
            </details>
          ))}
        </div>
      </section>

      <section id="bloqueos" aria-labelledby="suppressions-title" className="scroll-mt-6 space-y-5">
        <SectionHeading
          eyebrow="Reputación y consentimiento"
          title="Destinatarios bloqueados"
          description="WBStraders evita nuevos envíos a direcciones que rebotaron, denunciaron spam o fueron bloqueadas por Resend."
        />
        {suppressionRows.length > 0 ? (
          <AdminTable
            caption="Destinatarios actualmente bloqueados para nuevos envíos"
            headers={["Correo", "Motivo", "Estado", "Actualizado"]}
            rows={suppressionRows}
          />
        ) : (
          <AdminEmptyState
            icon={ShieldAlert}
            kind="empty"
            title="No hay destinatarios bloqueados"
            description="La reputación de envío no registra rebotes permanentes ni quejas activas."
          />
        )}
      </section>
    </>
  );
}

function SystemNotice({ data }: { data: AdminEmailDashboard }) {
  return (
    <section
      aria-labelledby="email-system-title"
      className="rounded-2xl border border-gold-500/40 bg-gold-500/10 p-5 sm:p-6"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-500/20 text-ink-900">
            <Settings2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-olive-800">
              Configuración actual
            </p>
            <h2 id="email-system-title" className="mt-1 font-display text-2xl font-semibold text-ink-900">
              {data.settings.testMode ? "Modo de prueba seguro" : "Operación de email"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-700">
              {data.settings.testMode
                ? `Todos los correos transaccionales se redirigen a ${data.settings.testRecipient}. Ningún cliente real recibirá mensajes durante las pruebas.`
                : "Los correos transaccionales se envían al destinatario asociado a cada pedido o reclamo."}
            </p>
          </div>
        </div>
        <dl className="grid gap-2 text-sm sm:grid-cols-3 lg:min-w-[30rem]">
          <SystemState
            label="Transaccional"
            value={data.settings.transactionalEnabled ? "Activo" : "Inactivo"}
            active={data.settings.transactionalEnabled}
          />
          <SystemState
            label="Marketing"
            value={data.settings.marketingEnabled ? "Activo" : "Pausado"}
            active={data.settings.marketingEnabled}
          />
          <SystemState
            label="Remitente"
            value={data.settings.fromAddress || "Sin configurar"}
            active={Boolean(data.settings.fromAddress)}
          />
        </dl>
      </div>
    </section>
  );
}

function SystemState({ label, value, active }: { label: string; value: string; active: boolean }) {
  return (
    <div className="rounded-xl border border-cream-300 bg-cream-50 px-3 py-3">
      <dt className="text-xs font-bold uppercase tracking-wide text-ink-500">{label}</dt>
      <dd className="mt-1 flex items-start gap-2 font-semibold text-ink-900">
        <span
          aria-hidden="true"
          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${active ? "bg-olive-600" : "bg-gold-600"}`}
        />
        <span className="break-all">{value}</span>
      </dd>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header>
      <p className="text-sm font-semibold text-olive-700">{eyebrow}</p>
      <h2 className="mt-1 font-display text-2xl font-semibold text-ink-900">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-700">{description}</p>
    </header>
  );
}

function TemplateDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-ink-500">{label}</dt>
      <dd className="mt-1 text-ink-700">{value}</dd>
    </div>
  );
}

function friendlyEmailError(value: string): string {
  const messages: Record<string, string> = {
    resend_rate_limit_exceeded: "Resend limitó temporalmente el envío.",
    resend_provider_error: "Resend no pudo procesar el mensaje.",
    email_job_processing_failed: "No se pudo preparar el contenido del correo.",
    recipient_suppressed: "El destinatario está bloqueado para proteger la reputación.",
  };
  return messages[value] || value.replaceAll("_", " ");
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
