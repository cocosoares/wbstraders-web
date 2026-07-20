import { Boxes } from "lucide-react";
import { AdminEmptyState } from "@/components/admin/empty-state";
import { AdminTable, type AdminTableRow } from "@/components/admin/admin-table";
import { loadInventory } from "@/components/admin/admin-data";
import { StockLevel } from "@/components/admin/stock-level";
import { InventoryMovementForm } from "@/components/admin/inventory-movement-form";
import { PRODUCTS } from "@/data/products";

export default async function AdminInventoryPage() {
  const result = await loadInventory();
  const rows: AdminTableRow[] =
    result.state === "ready"
      ? result.data.map((item) => ({
          id: item.productId,
          cells: [
            {
              label: "Producto",
              value: (
                <div>
                  <p className="font-semibold text-ink-900">{item.productName}</p>
                  <p className="mt-1 text-xs text-ink-500">{item.productId}</p>
                </div>
              ),
            },
            {
              label: "En almacén",
              value: <StockLevel value={item.onHand} />,
              align: "right",
            },
            {
              label: "Reservado",
              value: <StockLevel value={item.reserved} />,
              align: "right",
            },
            {
              label: "Disponible",
              value: <StockLevel value={item.available} emphasize />,
              align: "right",
            },
          ],
        }))
      : [];

  return (
    <div className="space-y-6">
      <Header />
      {result.state === "ready" && (
        <InventoryMovementForm
          products={PRODUCTS.map((product) => ({
            id: product.id,
            name: product.name,
          }))}
        />
      )}
      {result.state === "ready" && result.data.length > 0 ? (
        <AdminTable
          caption="Disponibilidad actual por producto"
          headers={["Producto", "En almacén", "Reservado", "Disponible"]}
          rows={rows}
        />
      ) : (
        <AdminEmptyState
          icon={Boxes}
          kind={result.state === "ready" ? "empty" : result.state}
          title={
            result.state === "ready"
              ? "No hay movimientos de inventario"
              : result.state === "demo"
                ? "Conecta Supabase para ver inventario"
                : "No pudimos consultar el inventario"
          }
          description={
            result.state === "ready"
              ? "Registra el inventario inicial en el libro de movimientos para calcular unidades disponibles."
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
        Operación
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink-900 sm:text-4xl">
        Inventario
      </h1>
      <p className="mt-2 max-w-2xl text-base leading-7 text-ink-700">
        Consulta existencias, reservas activas y disponibilidad para venta.
      </p>
    </header>
  );
}
