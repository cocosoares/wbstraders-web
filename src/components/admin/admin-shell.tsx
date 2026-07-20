"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  Handshake,
  LayoutDashboard,
  Mail,
  MessageCircle,
  MessageSquareWarning,
  ReceiptText,
  ShoppingBag,
  Users,
} from "lucide-react";
import { LogoIcon, LogoWordmark } from "@/components/logo";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/admin/logout-button";

const NAVIGATION = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard },
  { href: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/admin/conversaciones", label: "Conversaciones", icon: MessageCircle },
  { href: "/admin/reclamos", label: "Reclamos", icon: MessageSquareWarning },
  { href: "/admin/comprobantes", label: "Comprobantes", icon: ReceiptText },
  { href: "/admin/emails", label: "Emails", icon: Mail },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/inventario", label: "Inventario", icon: Boxes },
  { href: "/admin/oportunidades", label: "Oportunidades", icon: Handshake },
] as const;

type AdminShellProps = {
  children: React.ReactNode;
  mode: "live" | "demo";
  userEmail: string | null;
  displayName: string;
};

export function AdminShell({
  children,
  mode,
  userEmail,
  displayName,
}: AdminShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh bg-cream-100 text-ink-900">
      <a
        href="#admin-content"
        className="fixed left-3 top-3 z-[220] -translate-y-20 rounded-lg bg-ink-900 px-4 py-3 font-semibold text-cream-50 transition-transform focus:translate-y-0"
      >
        Ir al contenido
      </a>

      <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_1fr]">
        <aside className="border-b border-cream-300 bg-cream-50 lg:fixed lg:inset-y-0 lg:left-0 lg:w-[17rem] lg:border-b-0 lg:border-r">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:h-full lg:flex-col lg:items-stretch lg:justify-start lg:px-5 lg:py-6">
            <Link
              href="/admin"
              aria-label="WBStraders administración — resumen"
              className="flex min-h-11 items-center gap-2 rounded-lg"
            >
              <LogoIcon className="text-ink-900" />
              <LogoWordmark />
            </Link>

            <div className="hidden lg:block">
              <p className="mt-8 px-3 text-xs font-bold uppercase tracking-[0.16em] text-ink-500">
                Administración
              </p>
              <AdminNavigation pathname={pathname} />
            </div>

            <div className="hidden lg:mt-auto lg:block">
              <div className="rounded-xl border border-cream-300 bg-cream-100 p-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-olive-700 text-sm font-bold text-cream-50">
                    {initials(displayName)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-900">
                      {displayName}
                    </p>
                    <p className="truncate text-xs text-ink-500">
                      {userEmail || "Modo sin conexión"}
                    </p>
                  </div>
                </div>
                <LogoutButton demo={mode === "demo"} />
              </div>
            </div>

            <div className="lg:hidden">
              <LogoutButton demo={mode === "demo"} compact />
            </div>
          </div>

          <nav
            aria-label="Administración"
            className="border-t border-cream-300 px-4 py-2 lg:hidden"
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {NAVIGATION.map((item) => (
                <NavItem key={item.href} item={item} pathname={pathname} compact />
              ))}
            </div>
          </nav>
        </aside>

        <div className="lg:col-start-2">
          {mode === "demo" && (
            <div
              role="status"
              className="border-b border-gold-500/40 bg-gold-500/10 px-4 py-3 text-center text-sm font-medium text-ink-700 sm:px-6"
            >
              Modo de configuración: no se muestran datos hasta conectar Supabase.
            </div>
          )}
          <main
            id="admin-content"
            tabIndex={-1}
            className="mx-auto w-full max-w-[100rem] px-4 py-8 outline-none sm:px-6 sm:py-10 lg:px-10 xl:px-12"
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

function AdminNavigation({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Administración" className="mt-3 space-y-1">
      {NAVIGATION.map((item) => (
        <NavItem key={item.href} item={item} pathname={pathname} />
      ))}
    </nav>
  );
}

function NavItem({
  item,
  pathname,
  compact = false,
}: {
  item: (typeof NAVIGATION)[number];
  pathname: string;
  compact?: boolean;
}) {
  const active =
    item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors duration-200",
        active
          ? "bg-olive-100 text-olive-900"
          : "text-ink-700 hover:bg-cream-200 hover:text-ink-900",
        compact && "gap-2",
      )}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      {item.label}
    </Link>
  );
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "WB";
}
