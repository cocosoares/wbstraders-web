"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, MessageCircle, ShoppingBag, X } from "lucide-react";
import { LogoIcon, LogoWordmark } from "@/components/logo";
import { SITE } from "@/data/site";
import { useCart } from "@/hooks/use-cart";

const NAV_LINKS = [
  { href: "/catalogo", label: "Catálogo" },
  { href: "/arma-tu-caja", label: "Arma tu caja" },
  { href: "/#bodegas", label: "Bodegas" },
  { href: "/#delivery", label: "Delivery" },
  { href: "/#contacto", label: "Contacto" },
];

export function Navbar() {
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const items = useCart((s) => s.items);
  const openCart = useCart((s) => s.openCart);

  useEffect(() => setMounted(true), []);
  const count = mounted
    ? Object.values(items).reduce((acc, qty) => acc + qty, 0)
    : 0;

  return (
    <header className="sticky top-0 z-40 border-b border-cream-300/70 bg-cream-100/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2"
          aria-label="WBStraders — inicio"
        >
          <LogoIcon className="text-ink-900" />
          <LogoWordmark />
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Principal">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-ink-700 transition-colors duration-200 hover:text-wine-600"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <a
            href={`https://wa.me/${SITE.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Escríbenos por WhatsApp"
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink-700 transition-colors duration-200 hover:bg-olive-100 hover:text-olive-700"
          >
            <MessageCircle className="h-5 w-5" />
          </a>
          <button
            type="button"
            onClick={openCart}
            aria-label={`Abrir carrito (${count} botellas)`}
            className="relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-ink-700 transition-colors duration-200 hover:bg-wine-50 hover:text-wine-600"
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-wine-600 px-1 text-[11px] font-bold text-cream-50">
                {count}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-ink-700 transition-colors duration-200 hover:bg-cream-200 md:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-cream-300/70 md:hidden"
            aria-label="Menú móvil"
          >
            <div className="flex flex-col px-4 py-3">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-3 text-base font-medium text-ink-700 transition-colors duration-200 hover:bg-cream-200"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
