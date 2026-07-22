import { Users } from "lucide-react";
import { AdminEmptyState } from "@/components/admin/empty-state";
import { CrmCustomerProfile } from "@/components/admin/crm-customer-profile";
import { loadCrmCustomer } from "@/lib/crm/admin";

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await loadCrmCustomer(id);
  return result.state === "ready" ? (
    <CrmCustomerProfile customer={result.data} />
  ) : (
    <AdminEmptyState
      icon={Users}
      kind={result.state}
      title={result.state === "demo" ? "Conecta Supabase para ver el cliente" : "No pudimos cargar esta ficha"}
      description={result.message}
    />
  );
}
