import { ShoppingBag } from "lucide-react";
import { AdminEmptyState } from "@/components/admin/empty-state";
import { AdminTable, type AdminTableRow } from "@/components/admin/admin-table";
import { loadOrders } from "@/components/admin/admin-data";
import { formatAdminCurrency, formatAdminDate } from "@/components/admin/format";
import { StatusBadge } from "@/components/admin/status-badge";
import { OrderActionForm } from "@/components/admin/order-action-form";
import { ManualPaymentForm } from "@/components/admin/manual-payment-form";

export default async function AdminOrdersPage() {
  const result = await loadOrders();
  const rows: AdminTableRow[] =
    result.state === "ready"
      ? result.data.map((order) => ({
          id: order.id,
          cells: [
            {
              label: "Pedido",
              value: (
                <div>
                  <p className="font-semibold text-ink-900">
                    {order.orderNumber || "Sin número"}
                  </p>
                  <p className="mt-1 text-xs text-ink-500">
                    {order.channel === "web" ? "Tienda web" : order.channel}
                  </p>
                </div>
              ),
            },
            {
              label: "Cliente",
              value: (
                <div>
                  <p className="font-medium text-ink-900">{order.customerName}</p>
                  {order.customerEmail && (
                    <p className="mt-1 break-all text-xs text-ink-500">
                      {order.customerEmail}
                    </p>
                  )}
                </div>
              ),
            },
            {
              label: "Fecha",
              value: formatAdminDate(order.createdAt),
            },
            {
              label: "Estado",
              value: (
                <div className="flex flex-col items-start gap-2">
                  <StatusBadge status={order.status} />
                  <span className="text-xs text-ink-500">
                    Pago: {order.paymentStatus === "approved" ? "aprobado" : "pendiente"}
                  </span>
                </div>
              ),
            },
            {
              label: "Total",
              value: (
                <span className="font-semibold tabular-nums text-ink-900">
                  {formatAdminCurrency(order.totalCents, order.currency)}
                </span>
              ),
              align: "right",
            },
            {
              label: "Acción",
              value: (
                <div className="space-y-3">
                  {order.paymentProvider === "manual" && order.paymentStatus === "pending" && (
                    <ManualPaymentForm
                      orderId={order.id}
                      totalCents={order.totalCents}
                      currency={order.currency}
                    />
                  )}
                  <OrderActionForm
                    orderId={order.id}
                    fulfillmentStatus={order.fulfillmentStatus}
                    paymentStatus={order.paymentStatus}
                  />
                </div>
              ),
            },
          ],
        }))
      : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operación"
        title="Pedidos"
        description="Revisa pagos confirmados y el avance de preparación y entrega."
      />
      {result.state === "ready" && result.data.length > 0 ? (
        <AdminTable
          caption="Pedidos registrados, ordenados desde el más reciente"
          headers={["Pedido", "Cliente", "Fecha", "Estado", "Total", "Acción"]}
          rows={rows}
        />
      ) : (
        <AdminEmptyState
          icon={ShoppingBag}
          kind={result.state === "ready" ? "empty" : result.state}
          title={
            result.state === "ready"
              ? "Todavía no hay pedidos"
              : result.state === "demo"
                ? "Conecta Supabase para ver pedidos"
                : "No pudimos consultar los pedidos"
          }
          description={
            result.state === "ready"
              ? "Cuando un checkout cree un pedido, aparecerá aquí con su estado de pago y despacho."
              : result.message
          }
        />
      )}
    </div>
  );
}

function PageHeader({
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
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-olive-700">
        {eyebrow}
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink-900 sm:text-4xl">
        {title}
      </h1>
      <p className="mt-2 max-w-2xl text-base leading-7 text-ink-700">
        {description}
      </p>
    </header>
  );
}
