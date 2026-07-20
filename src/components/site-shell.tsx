"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AgeGate } from "@/components/age-gate";
import { CartDrawer } from "@/components/cart-drawer";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { SommelierWidget } from "@/components/sommelier-widget";

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const hideSommelier =
    pathname === "/checkout" ||
    pathname.startsWith("/pago/") ||
    pathname === "/libro-de-reclamaciones" ||
    pathname === "/horeca";

  if (isAdmin) return <>{children}</>;

  return (
    <>
      <a
        href="#contenido-principal"
        className="sr-only z-[1100] rounded-lg bg-cream-50 px-4 py-3 font-semibold text-ink-900 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Saltar al contenido
      </a>
      <Navbar />
      <main id="contenido-principal" tabIndex={-1}>
        {children}
      </main>
      <Footer />
      <CartDrawer />
      {!hideSommelier && <SommelierWidget />}
      <AgeGate />
    </>
  );
}
