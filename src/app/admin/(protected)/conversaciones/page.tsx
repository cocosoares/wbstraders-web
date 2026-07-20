import { MessageCircle } from "lucide-react";
import { loadWhatsAppInbox, loadWhatsAppMetrics } from "@/components/admin/admin-data";
import { WhatsAppInboxPreview } from "@/components/admin/whatsapp-inbox-preview";
import { WhatsAppMetrics } from "@/components/admin/whatsapp-metrics";

export default async function AdminConversationsPage() {
  const [inbox, metrics] = await Promise.all([loadWhatsAppInbox(), loadWhatsAppMetrics()]);
  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-olive-700">
          Atención comercial
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-semibold text-ink-900 sm:text-4xl">
            Conversaciones
          </h1>
          <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-cream-300 bg-cream-100 px-2.5 py-1 text-xs font-bold text-ink-700">
            <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
            WhatsApp
          </span>
        </div>
        <p className="mt-2 max-w-2xl text-base leading-7 text-ink-700">
          Centraliza las consultas de venta y postventa para que cada cliente
          reciba una respuesta útil, oportuna y consistente.
        </p>
      </header>

      <WhatsAppMetrics metrics={metrics} />
      <WhatsAppInboxPreview inbox={inbox} />
    </div>
  );
}
