import {
  AlarmClock,
  Bot,
  CheckSquare2,
  Flame,
  KanbanSquare,
  MessageCircle,
  ShoppingBag,
  Timer,
  UserRoundPlus,
  UsersRound,
  WalletCards,
  Wine,
} from "lucide-react";
import { MetricCard } from "@/components/admin/metric-card";
import { crmStageLabel } from "@/lib/crm/scoring";
import type { CrmMetrics } from "@/lib/crm/types";

export function CrmMetricsGrid({ metrics }: { metrics: CrmMetrics }) {
  const response = metrics.averageFirstResponseMinutes === null
    ? "—"
    : `${Math.round(metrics.averageFirstResponseMinutes)} min`;
  const bottles = metrics.averageBottlesPerOrder === null
    ? "—"
    : metrics.averageBottlesPerOrder.toFixed(1);
  return (
    <section aria-label="Indicadores del CRM" className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
        <MetricCard label="Conversaciones abiertas" value={String(metrics.openConversations)} detail={`${metrics.newConversations} nuevas en 30 días · ${metrics.unreadConversations} sin leer`} icon={MessageCircle} />
        <MetricCard label="SLA vencido" value={String(metrics.breachedSla)} detail="Meta: responder en 10 minutos" icon={AlarmClock} />
        <MetricCard label="Primera respuesta" value={response} detail={`${metrics.openHumanHandoffs} derivaciones abiertas`} icon={Timer} />
        <MetricCard label="Resolución por bot" value={formatPercent(metrics.botResolutionRate)} detail="Frente a atención humana" icon={Bot} />
        <MetricCard label="Leads calientes" value={String(metrics.hotLeads)} detail="Score comercial de 50 o más" icon={Flame} />
        <MetricCard label="Tareas vencidas" value={String(metrics.overdueTasks)} detail={`${metrics.openTasks} seguimientos abiertos`} icon={CheckSquare2} />
        <MetricCard label="Conversión de checkout" value={formatPercent(metrics.checkoutConversionRate)} detail={`${metrics.totalCheckouts} iniciados · ${metrics.abandonedCheckouts} abandonados`} icon={ShoppingBag} />
        <MetricCard label="Checkouts recuperados" value={String(metrics.recoveredCheckouts)} detail="Compra completada después de visitar" icon={UserRoundPlus} />
        <MetricCard label="Pedidos WhatsApp" value={String(metrics.whatsappOrders)} detail="Últimos 30 días" icon={ShoppingBag} />
        <MetricCard label="Ingresos WhatsApp" value={formatMoney(metrics.whatsappRevenueCents)} detail="Atribuidos en los últimos 30 días" icon={WalletCards} />
        <MetricCard label="Botellas por pedido" value={bottles} detail="Promedio de pedidos por WhatsApp" icon={Wine} />
        <MetricCard label="Pipeline abierto" value={formatMoney(metrics.pipelineValueCents)} detail={`${metrics.openOpportunityCount} oportunidades`} icon={KanbanSquare} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <Breakdown title="Oportunidades por etapa" icon={KanbanSquare} rows={Object.entries(metrics.opportunitiesByStage).map(([label, value]) => ({ label: crmStageLabel(label), value }))} />
        <Breakdown title="Clientes por segmento" icon={UsersRound} rows={Object.entries(metrics.customerSegments).map(([label, value]) => ({ label: lifecycleLabel(label), value }))} />
        <Breakdown title="Productos recomendados" icon={MessageCircle} rows={metrics.topRecommendedProducts.map((item) => ({ label: item.name, value: item.quantity }))} />
        <Breakdown title="Productos vendidos" icon={Wine} rows={metrics.topSoldProducts.map((item) => ({ label: item.name, value: item.quantity }))} />
      </div>
    </section>
  );
}

function Breakdown({ title, icon: Icon, rows }: { title: string; icon: typeof MessageCircle; rows: Array<{ label: string; value: number }> }) {
  return (
    <article className="rounded-xl border border-cream-300 bg-white p-4 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900"><Icon className="h-4 w-4 text-olive-700" aria-hidden="true" />{title}</h3>
      {rows.length ? <ol className="mt-3 space-y-2">{rows.slice(0, 5).map((row) => <li key={row.label} className="flex items-center justify-between gap-3 text-xs"><span className="min-w-0 truncate text-ink-700">{row.label}</span><strong className="shrink-0 rounded-full bg-cream-200 px-2 py-0.5 text-ink-900">{row.value}</strong></li>)}</ol> : <p className="mt-3 text-xs leading-5 text-ink-500">Aún no hay datos suficientes.</p>}
    </article>
  );
}

function formatMoney(cents: number) { return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 0 }).format(cents / 100); }
function formatPercent(value: number | null) { return value === null ? "—" : `${Math.round(value * 100)}%`; }
function lifecycleLabel(value: string) { return ({ prospect: "Prospectos", engaged: "Interesados", customer: "Nuevos", repeat: "Recurrentes", vip: "VIP", inactive: "Inactivos", horeca: "HORECA" } as Record<string, string>)[value] || value; }
