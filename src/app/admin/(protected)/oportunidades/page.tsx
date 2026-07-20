import { Handshake } from "lucide-react";
import { AdminEmptyState } from "@/components/admin/empty-state";
import { AdminTable, type AdminTableRow } from "@/components/admin/admin-table";
import { loadOpportunities } from "@/components/admin/admin-data";
import { formatAdminCurrency, formatAdminDate } from "@/components/admin/format";
import { StatusBadge } from "@/components/admin/status-badge";
import { OpportunityActionForm } from "@/components/admin/opportunity-action-form";

export default async function AdminOpportunitiesPage() {
  const result = await loadOpportunities();
  const rows: AdminTableRow[] =
    result.state === "ready"
      ? result.data.map((opportunity) => ({
          id: opportunity.id,
          cells: [
            {
              label: "Oportunidad",
              value: (
                <div>
                  <p className="font-semibold text-ink-900">{opportunity.title}</p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-ink-500">
                    {formatSegment(opportunity.segment)}
                  </p>
                </div>
              ),
            },
            {
              label: "Cliente",
              value: opportunity.customerName,
            },
            {
              label: "Etapa",
              value: <StatusBadge status={opportunity.stage} />,
            },
            {
              label: "Próxima acción",
              value: (
                <div>
                  <p className="text-sm text-ink-700">
                    {opportunity.nextAction || "Sin acción definida"}
                  </p>
                  <p className="mt-1 text-xs text-ink-500">
                    {opportunity.nextActionAt
                      ? formatAdminDate(opportunity.nextActionAt)
                      : "Sin fecha"}
                  </p>
                </div>
              ),
            },
            {
              label: "Valor",
              value: (
                <span className="font-semibold tabular-nums text-ink-900">
                  {opportunity.valueCents === null
                    ? "—"
                    : formatAdminCurrency(
                        opportunity.valueCents,
                        opportunity.currency,
                      )}
                </span>
              ),
              align: "right",
            },
            {
              label: "Gestionar",
              value: (
                <OpportunityActionForm
                  opportunityId={opportunity.id}
                  stage={opportunity.stage}
                />
              ),
            },
          ],
        }))
      : [];

  return (
    <div className="space-y-6">
      <Header />
      {result.state === "ready" && result.data.length > 0 ? (
        <AdminTable
          caption="Oportunidades HORECA y de regalos corporativos"
          headers={[
            "Oportunidad",
            "Cliente",
            "Etapa",
            "Próxima acción",
            "Valor",
            "Gestionar",
          ]}
          rows={rows}
        />
      ) : (
        <AdminEmptyState
          icon={Handshake}
          kind={result.state === "ready" ? "empty" : result.state}
          title={
            result.state === "ready"
              ? "No hay oportunidades abiertas"
              : result.state === "demo"
                ? "Conecta Supabase para ver oportunidades"
                : "No pudimos consultar las oportunidades"
          }
          description={
            result.state === "ready"
              ? "Las propuestas HORECA y de regalos corporativos aparecerán aquí con su próxima acción."
              : result.message
          }
        />
      )}
    </div>
  );
}

function Header() {
  return (
    <header>
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-olive-700">
        Pipeline comercial
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink-900 sm:text-4xl">
        Oportunidades
      </h1>
      <p className="mt-2 max-w-2xl text-base leading-7 text-ink-700">
        Da seguimiento a restaurantes, hoteles y regalos corporativos sin
        mezclar el pipeline con pedidos D2C.
      </p>
    </header>
  );
}

function formatSegment(segment: string) {
  const labels: Record<string, string> = {
    horeca: "HORECA",
    corporate_gifts: "Regalos corporativos",
    events: "Eventos",
    d2c: "Cliente final",
  };
  return labels[segment] || segment.replaceAll("_", " ");
}
