"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { BottleArt } from "@/components/bottle-art";
import { PRODUCTS } from "@/data/products";
import { SITE } from "@/data/site";
import { priceCart, type GroupPricing } from "@/lib/pricing";
import { formatPEN } from "@/lib/utils";
import { toCartLines, useCart } from "@/hooks/use-cart";

/** Barra de progreso hacia el envío gratis (incentivo de conversión). */
function FreeShippingBar({ subtotalCents }: { subtotalCents: number }) {
  const target = SITE.freeShippingFromCents;
  const missing = target - subtotalCents;
  const progress = Math.min(100, (subtotalCents / target) * 100);
  return (
    <div className="rounded-xl bg-olive-50 p-3">
      <p className="text-xs font-medium text-ink-700">
        {missing > 0 ? (
          <>
            Te faltan{" "}
            <span className="font-bold text-wine-600">{formatPEN(missing)}</span>{" "}
            para el envío gratis en Zona 1
          </>
        ) : (
          <span className="font-bold text-olive-700">
            ¡Tienes envío gratis en Zona 1!
          </span>
        )}
      </p>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-cream-300"
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progreso hacia envío gratis"
      >
        <div
          className="h-full rounded-full bg-olive-600 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/** Nudge de upsell: cuántas botellas faltan para la siguiente escala. */
function TierNudge({ group }: { group: GroupPricing }) {
  if (!group.next) return null;
  const { missing, unitCents } = group.next;
  return (
    <p className="mt-2 rounded-lg bg-wine-50 px-3 py-2 text-xs leading-relaxed text-wine-700">
      Agrega{" "}
      <span className="font-bold">
        {missing} {missing === 1 ? "botella" : "botellas"}
      </span>{" "}
      más de la línea {group.lineName} y el precio baja a{" "}
      <span className="font-bold">{formatPEN(unitCents)} c/u</span>
    </p>
  );
}

/** Venta cruzada: sugiere botellas complementarias que no están en el carrito. */
function CrossSell({ inCartIds }: { inCartIds: Set<string> }) {
  const priorities = [
    "ambrosia-brut-nature",
    "1700-torrontes",
    "rn40-malbec",
    "geografia-tintas",
  ];
  const suggestions = priorities
    .map((id) => PRODUCTS.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p && !inCartIds.has(p.id))
    .slice(0, 2);
  const add = useCart((s) => s.add);
  if (suggestions.length === 0) return null;

  return (
    <div className="border-t border-cream-300 pt-4">
      <h3 className="text-xs font-semibold tracking-widest text-ink-500 uppercase">
        Completa tu mesa
      </h3>
      <div className="mt-3 space-y-2">
        {suggestions.map((product) => (
          <div
            key={product.id}
            className="flex items-center gap-3 rounded-xl border border-cream-300 bg-cream-50 p-2.5"
          >
            <div className="h-14 w-9 shrink-0">
              <BottleArt product={product} className="h-14" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink-900">
                {product.name}
              </p>
              <p className="text-xs text-ink-500">
                Desde {formatPEN(product.tiers[0].packTotalCents)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => add(product.id)}
              aria-label={`Agregar ${product.name} al carrito`}
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-olive-600 text-cream-50 transition-colors duration-200 hover:bg-olive-700"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CartDrawer() {
  const [mounted, setMounted] = useState(false);
  const { items, isOpen, closeCart, setQty, remove } = useCart();
  useEffect(() => setMounted(true), []);

  const lines = mounted ? toCartLines(items) : [];
  const pricing = priceCart(lines);
  const inCartIds = new Set(lines.map((l) => l.product.id));

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            type="button"
            aria-label="Cerrar carrito"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="fixed inset-0 z-50 cursor-pointer bg-ink-900/50 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 z-50 flex h-dvh w-full max-w-md flex-col bg-cream-100 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Carrito de compras"
          >
            <div className="flex items-center justify-between border-b border-cream-300 px-5 py-4">
              <h2 className="font-display text-xl font-semibold">
                Tu carrito{" "}
                {pricing.bottles > 0 && (
                  <span className="text-sm font-normal text-ink-500">
                    ({pricing.bottles}{" "}
                    {pricing.bottles === 1 ? "botella" : "botellas"})
                  </span>
                )}
              </h2>
              <button
                type="button"
                onClick={closeCart}
                aria-label="Cerrar"
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-ink-700 transition-colors duration-200 hover:bg-cream-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
                <ShoppingBag className="h-12 w-12 text-ink-300" />
                <p className="text-ink-500">Tu carrito está vacío.</p>
                <Link
                  href="/catalogo"
                  onClick={closeCart}
                  className="rounded-lg bg-olive-600 px-6 py-3 font-semibold text-cream-50 transition-colors duration-200 hover:bg-olive-700"
                >
                  Explorar la cava
                </Link>
              </div>
            ) : (
              <>
                <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
                  <FreeShippingBar subtotalCents={pricing.subtotalCents} />

                  {pricing.groups.map((group) => (
                    <section
                      key={group.groupId}
                      aria-label={`Línea ${group.lineName}`}
                    >
                      <div className="flex items-baseline justify-between">
                        <h3 className="text-xs font-semibold tracking-widest text-olive-700 uppercase">
                          {group.lineName}
                        </h3>
                        {group.tier.label && group.tier.minQty > 1 && (
                          <span className="text-[11px] font-semibold text-wine-600">
                            {group.tier.label} aplicado
                          </span>
                        )}
                      </div>
                      <div className="mt-2 space-y-2">
                        {group.lines.map(({ product, qty }) => (
                          <div
                            key={product.id}
                            className="flex items-center gap-3 rounded-xl border border-cream-300 bg-cream-50 p-3"
                          >
                            <div className="h-16 w-10 shrink-0">
                              <BottleArt product={product} className="h-16" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-ink-900">
                                {product.name}
                              </p>
                              <p className="text-xs text-ink-500">
                                {formatPEN(group.unitCents)} c/u
                              </p>
                              <div className="mt-1.5 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setQty(product.id, qty - 1)}
                                  aria-label={`Quitar una botella de ${product.name}`}
                                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-cream-300 text-ink-700 transition-colors duration-200 hover:bg-cream-200"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <span className="w-6 text-center text-sm font-semibold">
                                  {qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setQty(product.id, qty + 1)}
                                  aria-label={`Agregar una botella de ${product.name}`}
                                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-cream-300 text-ink-700 transition-colors duration-200 hover:bg-cream-200"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => remove(product.id)}
                              aria-label={`Eliminar ${product.name} del carrito`}
                              className="cursor-pointer self-start p-1 text-ink-300 transition-colors duration-200 hover:text-wine-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <TierNudge group={group} />
                    </section>
                  ))}

                  <CrossSell inCartIds={inCartIds} />
                </div>

                <div className="border-t border-cream-300 bg-cream-50 px-5 py-4">
                  {pricing.savingsCents > 0 && (
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-ink-500">Precio regular</span>
                      <span className="text-ink-300 line-through">
                        {formatPEN(pricing.regularCents)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-ink-900">Subtotal</span>
                    <span className="text-xl font-bold text-wine-600">
                      {formatPEN(pricing.subtotalCents)}
                    </span>
                  </div>
                  {pricing.savingsCents > 0 && (
                    <p className="mt-1 text-right text-xs font-semibold text-olive-600">
                      Estás ahorrando {formatPEN(pricing.savingsCents)}
                    </p>
                  )}
                  <Link
                    href="/checkout"
                    onClick={closeCart}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-wine-600 px-6 py-4 font-bold text-cream-50 transition-colors duration-200 hover:bg-wine-700"
                  >
                    Ir a pagar
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                  <p className="mt-2 text-center text-xs text-ink-500">
                    Yape · Plin · Transferencia BCP · Tarjetas
                  </p>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
