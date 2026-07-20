import {
  AlertTriangle,
  Banknote,
  Box,
  ClipboardList,
  Handshake,
} from "lucide-react";
import { AdminEmptyState } from "@/components/admin/empty-state";
import { MetricCard } from "@/components/admin/metric-card";
import {
  loadDashboard,
  type DashboardData,
} from "@/components/admin/admin-data";
import { formatAdminCurrency, formatAdminDate } from "@/components/admin/format";
import { StatusBadge } from "@/components/admin/status-badge";

export default async function AdminDashboardPage() {
  const result = await loadDashboard();

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-olive-700">
          Resumen operativo
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink-900 sm:text-4xl">
          Panel de control
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-7 text-ink-700">
          Señales prioritarias para preparar pedidos, cuidar el stock y dar
          seguimiento comercial.
        </p>
      </header>

      {result.state !== "ready" ? (
        <AdminEmptyState
          kind={result.state}
          title={
            result.state === "demo"
              ? "Conecta Supabase para activar el panel"
              : "No pudimos cargar el resumen"
          }
          description={result.message}
        />
      ) : (
        <DashboardContent data={result.data} />
      )}
    </div>
  );
}

function DashboardContent({ data }: { data: DashboardData }) {
  return (
    <>
      <section aria-labelledby="metrics-title">
        <h2 id="metrics-title" className="sr-only">
          Indicadores de hoy
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Ventas pagadas hoy"
            value={formatAdminCurrency(data.paidTodayCents)}
            detail={`${data.paidTodayCount} pedido${data.paidTodayCount === 1 ? "" : "s"} confirmado${data.paidTodayCount === 1 ? "" : "s"}`}
            icon={Banknote}
          />
          <MetricCard
            label="Por preparar"
            value={String(data.toPrepareCount)}
            detail="Pedidos pagados o en picking"
            icon={ClipboardList}
          />
          <MetricCard
            label="Stock bajo"
            value={String(data.lowStockCount)}
            detail="Productos con 5 unidades o menos"
            icon={Box}
          />
          <MetricCard
            label="Seguimientos vencidos"
            value={String(data.overdueOpportunityCount)}
            detail="Oportunidades sin siguiente acción al día"
            icon={Handshake}
          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <section
          aria-labelledby="recent-orders-title"
          className="rounded-2xl border border-cream-300 bg-cream-50 p-5 shadow-sm sm:p-6"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-olive-700">Operación</p>
              <h2
                id="recent-orders-title"
                className="mt-1 font-display text-2xl font-semibold text-ink-900"
              >
                Pedidos recientes
              </h2>
            </div>
            <a
              href="/admin/pedidos"
              className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-bold text-wine-700 transition-colors duration-200 hover:bg-wine-50"
            >
              Ver todos
            </a>
          </div>

          {data.recentOrders.length === 0 ? (
            <p className="mt-6 rounded-xl border border-dashed border-cream-300 p-5 text-sm leading-6 text-ink-700">
              Aún no hay pedidos registrados. Los pagos confirmados aparecerán
              aquí sin necesidad de actualizar estados manualmente.
            </p>
          ) : (
            <ul className="mt-5 divide-y divide-cream-300" role="list">
              {data.recentOrders.map((order) => (
                <li
                  key={order.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900">
                      {order.orderNumber || "Pedido sin número"}
                    </p>
                    <p className="mt-1 text-sm text-ink-500">
                      {formatAdminDate(order.createdAt)} · {order.customerName}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <StatusBadge status={order.status} />
                    <span className="font-semibold tabular-nums text-ink-900">
                      {formatAdminCurrency(order.totalCents, order.currency)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          aria-labelledby="attention-title"
          className="rounded-2xl border border-cream-300 bg-cream-50 p-5 shadow-sm sm:p-6"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-500/15 text-gold-600">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-olive-700">Prioridades</p>
              <h2
                id="attention-title"
                className="mt-1 font-display text-2xl font-semibold text-ink-900"
              >
                Requiere atención
              </h2>
            </div>
          </div>

          <ul className="mt-5 space-y-3" role="list">
            <AttentionItem
              count={data.toPrepareCount}
              label="pedidos por preparar"
              href="/admin/pedidos"
            />
            <AttentionItem
              count={data.lowStockCount}
              label="productos con stock bajo"
              href="/admin/inventario"
            />
            <AttentionItem
              count={data.overdueOpportunityCount}
              label="seguimientos comerciales vencidos"
              href="/admin/oportunidades"
            />
          </ul>
        </section>
      </div>
    </>
  );
}

function AttentionItem({
  count,
  label,
  href,
}: {
  count: number;
  label: string;
  href: string;
}) {
  return (
    <li>
      <a
        href={href}
        className="flex min-h-14 items-center justify-between gap-4 rounded-xl border border-cream-300 bg-cream-100 px-4 py-3 transition-colors duration-200 hover:border-olive-400 hover:bg-olive-50"
      >
        <span className="text-sm font-medium leading-6 text-ink-700">{label}</span>
        <span className="rounded-full bg-ink-900 px-2.5 py-1 text-sm font-bold tabular-nums text-cream-50">
          {count}
        </span>
      </a>
    </li>
  );
}
