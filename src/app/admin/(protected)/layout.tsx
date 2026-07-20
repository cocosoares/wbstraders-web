import { requireAdminAccess } from "@/components/admin/admin-data";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function ProtectedAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const access = await requireAdminAccess();

  return (
    <AdminShell
      mode={access.mode}
      userEmail={access.userEmail}
      displayName={access.displayName}
    >
      {children}
    </AdminShell>
  );
}
