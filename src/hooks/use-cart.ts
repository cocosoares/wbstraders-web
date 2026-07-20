import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine } from "@/types";
import { PRODUCTS_BY_ID } from "@/data/products";

interface CartState {
  /** productId -> cantidad de botellas */
  items: Record<string, number>;
  isOpen: boolean;
  add: (productId: string, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  replace: (items: Record<string, number>) => void;
  openCart: () => void;
  closeCart: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: {},
      isOpen: false,
      add: (productId, qty = 1) =>
        set((state) => ({
          items: {
            ...state.items,
            [productId]: (state.items[productId] ?? 0) + qty,
          },
          isOpen: true,
        })),
      setQty: (productId, qty) =>
        set((state) => {
          if (qty <= 0) {
            const { [productId]: _removed, ...rest } = state.items;
            return { items: rest };
          }
          return { items: { ...state.items, [productId]: qty } };
        }),
      remove: (productId) =>
        set((state) => {
          const { [productId]: _removed, ...rest } = state.items;
          return { items: rest };
        }),
      clear: () => set({ items: {} }),
      replace: (items) =>
        set({
          items: Object.fromEntries(
            Object.entries(items).filter(
              ([productId, quantity]) =>
                PRODUCTS_BY_ID.has(productId) &&
                Number.isInteger(quantity) &&
                quantity > 0 &&
                quantity <= 24,
            ),
          ),
        }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
    }),
    {
      name: "wbs-cart-v1",
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

/** Convierte el estado del carrito en líneas con producto resuelto. */
export function toCartLines(items: Record<string, number>): CartLine[] {
  return Object.entries(items)
    .map(([id, qty]) => {
      const product = PRODUCTS_BY_ID.get(id);
      return product ? { product, qty } : null;
    })
    .filter((line): line is CartLine => line !== null && line.qty > 0);
}
