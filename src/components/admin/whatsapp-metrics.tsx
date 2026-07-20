import type { DataResult, AdminWhatsAppMetrics } from "@/components/admin/admin-data";

export function WhatsAppMetrics({
  metrics,
}: {
  metrics: DataResult<AdminWhatsAppMetrics>;
}) {
  if (metrics.state !== "ready") return null;

  const cards = [
    { label: "Conversaciones activas", value: String(metrics.data.activeConversations) },
    { label: "Derivaciones por atender", value: String(metrics.data.openHandoffs) },
    { label: "Checkouts iniciados hoy", value: String(metrics.data.checkoutStartsToday) },
    { label: "Ventas WhatsApp hoy", value: String(metrics.data.ordersToday) },
    {
      label: "Facturación WhatsApp hoy",
      value: new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency: "PEN",
        minimumFractionDigits: 0,
      }).format(metrics.data.revenueTodayCents / 100),
    },
  ];

  return (
    <section aria-label="Métricas de WhatsApp" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <article key={card.label} className="rounded-xl border border-cream-300 bg-cream-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{card.label}</p>
          <p className="mt-2 text-2xl font-bold text-ink-900">{card.value}</p>
        </article>
      ))}
    </section>
  );
}
