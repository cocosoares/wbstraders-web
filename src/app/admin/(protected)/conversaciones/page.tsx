import { MessageCircle } from "lucide-react";
import { PRODUCTS } from "@/data/products";
import { loadWhatsAppInbox, loadWhatsAppMetrics } from "@/components/admin/admin-data";
import { AdminEmptyState } from "@/components/admin/empty-state";
import { WhatsAppInboxPreview } from "@/components/admin/whatsapp-inbox-preview";
import { WhatsAppMetrics } from "@/components/admin/whatsapp-metrics";
import { CrmInboxWorkspace } from "@/components/admin/crm-inbox-workspace";
import { CrmMetricsGrid } from "@/components/admin/crm-metrics";
import { loadCrmInbox } from "@/lib/crm/admin";

export default async function AdminConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string }>;
}) {
  const crmEnabled = process.env.CRM_DASHBOARD_V2?.trim().toLowerCase() === "true";
  const params = await searchParams;

  if (!crmEnabled) {
    const [inbox, metrics] = await Promise.all([loadWhatsAppInbox(), loadWhatsAppMetrics()]);
    return (
      <div className="space-y-8">
        <Header preview />
        <WhatsAppMetrics metrics={metrics} />
        <WhatsAppInboxPreview inbox={inbox} />
      </div>
    );
  }

  const result = await loadCrmInbox(params.conversation);
  return (
    <div className="space-y-6">
      <Header />
      {result.state === "ready" ? (
        <>
          <CrmMetricsGrid metrics={result.data.metrics} />
          <CrmInboxWorkspace
            data={result.data}
            products={PRODUCTS.map((product) => ({ id: product.id, name: product.name }))}
          />
        </>
      ) : (
        <AdminEmptyState
          icon={MessageCircle}
          kind={result.state}
          title={result.state === "demo" ? "Conecta Supabase para usar el CRM" : "No pudimos cargar la bandeja"}
          description={result.message}
        />
      )}
    </div>
  );
}

function Header({ preview = false }: { preview?: boolean }) {
  return (
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
          {preview ? "WhatsApp · bandeja anterior" : "CRM de WhatsApp"}
        </span>
      </div>
      <p className="mt-2 max-w-3xl text-base leading-7 text-ink-700">
        {preview
          ? "Centraliza las consultas de venta y postventa. La nueva bandeja se activará después de aplicar y validar la migración CRM."
          : "Gestiona ventas y servicio en una sola vista: conversación, contexto comercial, tareas, SLA y cliente 360°."}
      </p>
    </header>
  );
}
