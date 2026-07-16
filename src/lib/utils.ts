import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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
