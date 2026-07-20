import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending_payment: { label: "Pago pendiente", className: "border-gold-500/40 bg-gold-500/10 text-ink-900" },
  paid: { label: "Pagado", className: "border-olive-400 bg-olive-100 text-olive-900" },
  picking: { label: "En preparación", className: "border-olive-400 bg-olive-50 text-olive-900" },
  dispatched: { label: "Despachado", className: "border-ink-300 bg-cream-200 text-ink-900" },
  delivered: { label: "Entregado", className: "border-olive-600 bg-olive-700 text-cream-50" },
  fulfilled: { label: "Completado", className: "border-olive-600 bg-olive-700 text-cream-50" },
  cancelled: { label: "Cancelado", className: "border-wine-400 bg-wine-50 text-wine-800" },
  refunded: { label: "Reembolsado", className: "border-wine-400 bg-wine-50 text-wine-800" },
  payment_failed: { label: "Pago rechazado", className: "border-wine-400 bg-wine-50 text-wine-800" },
  chargeback: { label: "Contracargo", className: "border-wine-600 bg-wine-100 text-wine-900" },
  lead: { label: "Lead", className: "border-ink-300 bg-cream-200 text-ink-900" },
  qualified: { label: "Calificada", className: "border-olive-400 bg-olive-100 text-olive-900" },
  tasting: { label: "Degustación", className: "border-gold-500/40 bg-gold-500/10 text-ink-900" },
  proposal: { label: "Propuesta", className: "border-olive-400 bg-olive-50 text-olive-900" },
  negotiation: { label: "Negociación", className: "border-gold-500/40 bg-gold-500/10 text-ink-900" },
  won: { label: "Ganada", className: "border-olive-600 bg-olive-700 text-cream-50" },
  lost: { label: "Perdida", className: "border-wine-400 bg-wine-50 text-wine-800" },
  reorder_due: { label: "Reposición", className: "border-olive-400 bg-olive-100 text-olive-900" },
  received: { label: "Recibido", className: "border-ink-300 bg-cream-200 text-ink-900" },
  in_review: { label: "En revisión", className: "border-gold-500/40 bg-gold-500/10 text-ink-900" },
  responded: { label: "Respondido", className: "border-olive-400 bg-olive-100 text-olive-900" },
  closed: { label: "Cerrado", className: "border-olive-600 bg-olive-700 text-cream-50" },
  pending: { label: "Pendiente", className: "border-gold-500/40 bg-gold-500/10 text-ink-900" },
  issued: { label: "Emitido registrado", className: "border-olive-400 bg-olive-100 text-olive-900" },
  rejected: { label: "Rechazado", className: "border-wine-400 bg-wine-50 text-wine-800" },
  processing: { label: "Procesando", className: "border-olive-400 bg-olive-50 text-olive-900" },
  sent: { label: "Enviado", className: "border-olive-400 bg-olive-100 text-olive-900" },
  failed: { label: "Fallido", className: "border-wine-400 bg-wine-50 text-wine-800" },
  dead: { label: "Agotado", className: "border-wine-600 bg-wine-100 text-wine-900" },
  suppressed: { label: "Bloqueado", className: "border-wine-400 bg-wine-50 text-wine-800" },
  opened: { label: "Abierto", className: "border-olive-400 bg-olive-50 text-olive-900" },
  bounced: { label: "Rebotado", className: "border-wine-400 bg-wine-50 text-wine-800" },
  complained: { label: "Marcado como spam", className: "border-wine-600 bg-wine-100 text-wine-900" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || {
    label: status.replaceAll("_", " "),
    className: "border-cream-300 bg-cream-100 text-ink-700",
  };

  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold",
        config.className,
      )}
    >
      <Circle className="h-2 w-2 fill-current" aria-hidden="true" />
      {config.label}
    </span>
  );
}
