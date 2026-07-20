import { MessageSquareWarning } from "lucide-react";
import { AdminEmptyState } from "@/components/admin/empty-state";
import { AdminTable, type AdminTableRow } from "@/components/admin/admin-table";
import { loadConsumerClaims } from "@/components/admin/admin-data";
import { formatAdminDate } from "@/components/admin/format";
import { StatusBadge } from "@/components/admin/status-badge";

export default async function AdminClaimsPage() {
  const result = await loadConsumerClaims();
  const rows: AdminTableRow[] =
    result.state === "ready"
      ? result.data.map((claim) => ({
          id: claim.id,
          cells: [
            {
              label: "Reclamo",
              value: (
                <div>
                  <p className="font-semibold text-ink-900">{claim.claimNumber}</p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-ink-500">
                    {claim.itemType === "product" ? "Producto" : "Servicio"}
                  </p>
                </div>
              ),
            },
            {
              label: "Tipo",
              value: (
                <span className="font-semibold capitalize text-ink-900">
                  {claim.claimType}
                </span>
              ),
            },
            {
              label: "Cliente",
              value: (
                <div>
                  <p className="font-medium text-ink-900">{claim.customerName}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-ink-500">
                    {formatDocumentType(claim.documentType)} {claim.maskedDocument}
                  </p>
                </div>
              ),
            },
            {
              label: "Contacto",
              value: (
                <address className="not-italic">
                  <p className="break-all text-sm text-ink-700">{claim.email}</p>
                  <p className="mt-1 text-xs text-ink-500">{claim.phone}</p>
                </address>
              ),
            },
            {
              label: "Pedido",
              value: claim.orderNumber || "Sin pedido asociado",
            },
            {
              label: "Detalle y solicitud",
              value: (
                <details className="max-w-xl rounded-lg border border-cream-300 bg-cream-100">
                  <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-bold text-olive-800">
                    Revisar contenido
                  </summary>
                  <div className="space-y-4 border-t border-cream-300 p-3 text-sm leading-6 text-ink-700">
                    <div>
                      <p className="font-bold text-ink-900">Detalle del consumidor</p>
                      <p className="mt-1 whitespace-pre-wrap break-words">{claim.detail}</p>
                    </div>
                    <div>
                      <p className="font-bold text-ink-900">Solicitud del consumidor</p>
                      <p className="mt-1 whitespace-pre-wrap break-words">
                        {claim.consumerRequest}
                      </p>
                    </div>
                  </div>
                </details>
              ),
            },
            {
              label: "Fecha",
              value: formatAdminDate(claim.createdAt),
            },
            {
              label: "Estado",
              value: <StatusBadge status={claim.status} />,
            },
          ],
        }))
      : [];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-olive-700">
          Atención al consumidor
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink-900 sm:text-4xl">
          Reclamos
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-7 text-ink-700">
          Revisa los registros del Libro de Reclamaciones para priorizar su atención.
          Esta vista no propone ni envía respuestas legales.
        </p>
      </header>

      {result.state === "ready" && result.data.length > 0 ? (
        <AdminTable
          caption="Reclamos y quejas registrados, ordenados desde el más reciente"
          headers={[
            "Reclamo",
            "Tipo",
            "Cliente",
            "Contacto",
            "Pedido",
            "Detalle y solicitud",
            "Fecha",
            "Estado",
          ]}
          rows={rows}
        />
      ) : (
        <AdminEmptyState
          icon={MessageSquareWarning}
          kind={result.state === "ready" ? "empty" : result.state}
          title={
            result.state === "ready"
              ? "No hay reclamos registrados"
              : result.state === "demo"
                ? "Conecta Supabase para ver reclamos"
                : "No pudimos consultar los reclamos"
          }
          description={
            result.state === "ready"
              ? "Los envíos confirmados desde el Libro de Reclamaciones aparecerán aquí para su revisión."
              : result.message
          }
        />
      )}
    </div>
  );
}

function formatDocumentType(type: string) {
  const labels: Record<string, string> = {
    dni: "DNI",
    ce: "CE",
    passport: "Pasaporte",
    ruc: "RUC",
  };
  return labels[type] || "Documento";
}
