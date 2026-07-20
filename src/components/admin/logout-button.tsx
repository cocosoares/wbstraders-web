"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { LoaderCircle, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export function LogoutButton({
  demo,
  compact = false,
}: {
  demo: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    if (!demo) {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      await supabase.auth.signOut();
    }
    router.replace(demo ? "/" : "/admin/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      aria-label={demo ? "Salir del modo de configuración" : "Cerrar sesión"}
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg text-sm font-semibold text-ink-700 transition-colors duration-200 hover:bg-wine-50 hover:text-wine-700 disabled:cursor-not-allowed disabled:opacity-60",
        compact ? "min-w-11 px-3" : "mt-3 w-full px-3",
      )}
    >
      {pending ? (
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <LogOut className="h-4 w-4" aria-hidden="true" />
      )}
      <span className={cn(compact && "sr-only")}>
        {demo ? "Salir" : "Cerrar sesión"}
      </span>
    </button>
  );
}
