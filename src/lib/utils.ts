import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { WineType } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const penFormatter = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

/** Formatea céntimos como "S/ 86.64" */
export function formatPEN(cents: number): string {
  return penFormatter.format(cents / 100);
}

export function toCents(soles: number): number {
  return Math.round(soles * 100);
}

/** Devuelve la clase de degradado elegante según el tipo de vino */
export function getWineBgGradient(type: WineType): string {
  switch (type) {
    case "Tinto":
      return "from-wine-900 to-ink-900"; // Burdeos elegante a tinta
    case "Blanco":
      return "from-olive-900 to-ink-900"; // Verde oliva sofisticado a tinta
    case "Rosado":
      return "from-rose-950 to-ink-900";  // Bronce rosado profundo a tinta
    case "Espumante":
      return "from-amber-950/25 to-ink-900"; // Resplandor dorado/ámbar cálido a tinta
    default:
      return "from-olive-900 to-ink-900";
  }
}
