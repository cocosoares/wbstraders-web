import { Users } from "lucide-react";
import Link from "next/link";
import { AdminEmptyState } from "@/components/admin/empty-state";
import { AdminTable, type AdminTableRow } from "@/components/admin/admin-table";
import { loadCustomers } from "@/components/admin/admin-data";
import { formatAdminDate } from "@/components/admin/format";

export default async function AdminCustomersPage() {
  const result = await loadCustomers();
  const rows: AdminTableRow[] =
    result.state === "ready"
      ? result.data.map((customer) => ({
          id: customer.id,
          cells: [
            {
              label: "Cliente",
              value: (
                <Link href={`/admin/clientes/${customer.id}`} className="font-semibold text-olive-800 hover:underline">
                  {customer.name || "Cliente sin nombre"}
                </Link>
              ),
            },
            {
              label: "Contacto",
              value: (
                <div className="space-y-1">
                  <p className="break-all text-sm text-ink-700">
                    {customer.email || "Sin correo"}
                  </p>
                  <p className="text-xs text-ink-500">
                    {customer.phone || "Sin teléfono"}
                  </p>
                </div>
              ),
            },
            {
              label: "Alta",
              value: formatAdminDate(customer.createdAt),
            },
          ],
        }))
      : [];

  return (
    <div className="space-y-6">
      <Header />
      {result.state === "ready" && result.data.length > 0 ? (
        <AdminTable
          caption="Clientes registrados, ordenados desde el más reciente"
          headers={["Cliente", "Contacto", "Alta"]}
          rows={rows}
        />
      ) : (
        <AdminEmptyState
          icon={Users}
          kind={result.state === "ready" ? "empty" : result.state}
          title={
            result.state === "ready"
              ? "Todavía no hay clientes"
              : result.state === "demo"
                ? "Conecta Supabase para ver clientes"
                : "No pudimos consultar los clientes"
          }
          description={
            result.state === "ready"
              ? "Los clientes se crearán desde el checkout y conservarán aquí sus datos operativos."
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
        Relación comercial
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink-900 sm:text-4xl">
        Clientes
      </h1>
      <p className="mt-2 max-w-2xl text-base leading-7 text-ink-700">
        Consulta datos de contacto registrados en pedidos y oportunidades.
      </p>
    </header>
  );
}
