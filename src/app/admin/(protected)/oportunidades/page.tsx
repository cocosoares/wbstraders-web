import { Handshake } from "lucide-react";
import { AdminEmptyState } from "@/components/admin/empty-state";
import { loadOpportunities } from "@/components/admin/admin-data";
import { CrmPipelineBoard } from "@/components/admin/crm-pipeline-board";

export default async function AdminOpportunitiesPage() {
  const result = await loadOpportunities();
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-olive-700">Pipeline comercial</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink-900 sm:text-4xl">Oportunidades</h1>
        <p className="mt-2 max-w-3xl text-base leading-7 text-ink-700">Controla por separado el embudo de venta directa y el de restaurantes, hoteles, eventos y regalos corporativos.</p>
      </header>
      {result.state === "ready" ? (
        <CrmPipelineBoard opportunities={result.data} />
      ) : (
        <AdminEmptyState icon={Handshake} kind={result.state} title={result.state === "demo" ? "Conecta Supabase para ver oportunidades" : "No pudimos cargar el pipeline"} description={result.message} />
      )}
    </div>
  );
}
