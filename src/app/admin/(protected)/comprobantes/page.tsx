import { ReceiptText } from "lucide-react";
import { AdminEmptyState } from "@/components/admin/empty-state";
import { AdminTable, type AdminTableRow } from "@/components/admin/admin-table";
import { loadFiscalDocuments } from "@/components/admin/admin-data";
import { FiscalDocumentActionForm } from "@/components/admin/fiscal-document-action-form";
import { formatAdminDate } from "@/components/admin/format";
import { StatusBadge } from "@/components/admin/status-badge";
import { isFiscalSandboxUiEnabled } from "@/lib/fiscal/runtime";

export default async function AdminFiscalDocumentsPage() {
  const result = await loadFiscalDocuments();
  const sandboxEnabled = isFiscalSandboxUiEnabled();
  const rows: AdminTableRow[] =
    result.state === "ready"
      ? result.data.map((document) => ({
          id: document.id,
          cells: [
            {
              label: "Pedido",
              value: (
                <p className="font-semibold text-ink-900">{document.orderNumber}</p>
              ),
            },
            {
              label: "Comprobante",
              value: (
                <div>
                  <p className="font-semibold capitalize text-ink-900">
                    {formatDocumentType(document.documentType)}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-ink-500">
                    {formatProvider(document.provider)}
                  </p>
                  {document.testMode && (
                    <p className="mt-1 text-xs font-bold uppercase tracking-wide text-wine-700">
                      Sin validez SUNAT
                    </p>
                  )}
                </div>
              ),
            },
            {
              label: "Destinatario fiscal",
              value: (
                <div className="max-w-sm space-y-1">
                  <p className="font-medium text-ink-900">{document.recipientName}</p>
                  <p className="text-xs text-ink-500">
                    {formatFiscalDocument(
                      document.recipientDocumentType,
                      document.recipientDocumentNumber,
                    )}
                  </p>
                  {document.recipientAddress && (
                    <p className="text-xs leading-5 text-ink-500">
                      {document.recipientAddress}
                    </p>
                  )}
                  {document.recipientEmail && (
                    <p className="break-all text-xs text-ink-500">
                      {document.recipientEmail}
                    </p>
                  )}
                </div>
              ),
            },
            {
              label: "Estado",
              value: (
                <div className="max-w-xs space-y-2">
                  <StatusBadge status={document.status} />
                  {document.statusReason && (
                    <p className="text-xs leading-5 text-ink-500">
                      {document.statusReason}
                    </p>
                  )}
                </div>
              ),
            },
            {
              label: "Fecha",
              value: (
                <div>
                  <p>{formatAdminDate(document.createdAt)}</p>
                  {document.issuedAt && (
                    <p className="mt-1 text-xs text-ink-500">
                      Resultado: {formatAdminDate(document.issuedAt)}
                    </p>
                  )}
                </div>
              ),
            },
            {
              label: "Serie / número",
              value: (
                <div>
                  <p className="font-semibold tabular-nums text-ink-900">
                    {document.series && document.number
                      ? `${document.series}-${document.number}`
                      : "Pendiente de registro"}
                  </p>
                  {document.providerReference && (
                    <p className="mt-1 break-all text-xs text-ink-500">
                      Ref. {document.providerReference}
                    </p>
                  )}
                </div>
              ),
            },
            {
              label: "Acción",
              value: (
                <FiscalDocumentActionForm
                  fiscalDocumentId={document.id}
                  status={document.status}
                  documentType={document.documentType}
                  provider={document.provider}
                  sandboxEnabled={sandboxEnabled}
                />
              ),
            },
          ],
        }))
      : [];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-olive-700">
          {sandboxEnabled ? "Operación fiscal de prueba" : "Operación fiscal manual"}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink-900 sm:text-4xl">
          Comprobantes
        </h1>
        <p className="mt-2 max-w-3xl text-base leading-7 text-ink-700">
          {sandboxEnabled
            ? "El modo de prueba solo admite pedidos internos con cupón y pago conciliado. Cada documento queda marcado sin validez tributaria y no se envía a SUNAT."
            : "Registra el resultado obtenido en SEE-SOL o en el back office fiscal. WBStraders no emite, firma ni anula comprobantes ante SUNAT desde esta pantalla."}
        </p>
      </header>

      {result.state === "ready" && result.data.length > 0 ? (
        <AdminTable
          caption="Cola de comprobantes fiscales, ordenada desde el registro más reciente"
          headers={[
            "Pedido",
            "Comprobante",
            "Destinatario fiscal",
            "Estado",
            "Fecha",
            "Serie / número",
            "Acción",
          ]}
          rows={rows}
        />
      ) : (
        <AdminEmptyState
          icon={ReceiptText}
          kind={result.state === "ready" ? "empty" : result.state}
          title={
            result.state === "ready"
              ? "No hay comprobantes en la cola"
              : result.state === "demo"
                ? "Conecta Supabase para ver comprobantes"
                : "No pudimos consultar los comprobantes"
          }
          description={
            result.state === "ready"
              ? "Los pedidos que soliciten boleta o factura aparecerán aquí para conciliación manual."
              : result.message
          }
        />
      )}
    </div>
  );
}

function formatDocumentType(type: string) {
  const labels: Record<string, string> = {
    boleta: "Boleta",
    factura: "Factura",
    nota_credito: "Nota de crédito",
    nota_debito: "Nota de débito",
  };
  return labels[type] || type.replaceAll("_", " ");
}

function formatProvider(provider: string) {
  const labels: Record<string, string> = {
    manual: "Registro manual",
    sunat_sol: "SEE-SOL",
    pse: "PSE",
    sandbox: "Prueba sin validez",
  };
  return labels[provider] || provider;
}

function formatFiscalDocument(type: string | null, number: string | null) {
  if (!number) return "Documento no informado";
  const label = type === "ruc" ? "RUC" : type === "dni" ? "DNI" : "Documento";
  return `${label} ${number}`;
}
