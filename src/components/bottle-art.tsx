import Image from "next/image";
import type { Product, WineType } from "@/types";
import { cn } from "@/lib/utils";

/**
 * Ilustración SVG elegante de la botella según tipo de vino y línea.
 * Si el producto tiene `image` (foto real en /public), se usa esa foto.
 */

const GLASS: Record<WineType, { body: string; shine: string }> = {
  Tinto: { body: "#372631", shine: "#4d3644" },
  Blanco: { body: "#a8b47e", shine: "#c2cd97" },
  Rosado: { body: "#d9a7a4", shine: "#e8c2bf" },
  Espumante: { body: "#33432f", shine: "#4a5d45" },
};

const LINE_ACCENT: Record<string, string> = {
  Livverá: "#8a8577",
  "Livverá Mix": "#8a8577",
  "Brut Nature": "#7a1f2e",
  Casa: "#7a1f2e",
  "Geografía Extraordinaria": "#4f6b42",
  "1700 msnm": "#b08a3e",
  "1700 msnm Tintas": "#7a1f2e",
  RN40: "#201d17",
};

export function BottleArt({
  product,
  className,
  priority = false,
}: {
  product: Product;
  className?: string;
  priority?: boolean;
}) {
  if (product.image) {
    return (
      <Image
        src={product.image}
        alt={`Botella de ${product.name}`}
        width={240}
        height={640}
        priority={priority}
        className={cn("h-full w-auto object-contain", className)}
      />
    );
  }

  const glass = GLASS[product.type];
  const accent = LINE_ACCENT[product.line] ?? "#8a8577";
  const isDarkLabel = product.line === "RN40";
  const labelBg = isDarkLabel ? "#211f1c" : "#f5f0e4";
  const labelLine = isDarkLabel ? "#c7c1b2" : accent;
  const isSparkling = product.type === "Espumante";

  return (
    <svg
      viewBox="0 0 120 320"
      role="img"
      aria-label={`Ilustración de botella: ${product.name}`}
      className={cn("h-full w-auto drop-shadow-md", className)}
    >
      {/* Cápsula */}
      <rect
        x={isSparkling ? 49 : 51}
        y="14"
        width={isSparkling ? 22 : 18}
        height={isSparkling ? 34 : 28}
        rx="4"
        fill={isSparkling ? "#b08a3e" : accent}
      />
      {/* Cuerpo de la botella */}
      <path
        d={
          isSparkling
            ? "M53 40 h14 v28 c0 14 18 20 18 42 v186 a10 10 0 0 1 -10 10 H45 a10 10 0 0 1 -10 -10 V110 c0 -22 18 -28 18 -42 Z"
            : "M54 36 h12 v34 c0 13 16 18 16 38 v188 a9 9 0 0 1 -9 9 H47 a9 9 0 0 1 -9 -9 V108 c0 -20 16 -25 16 -38 Z"
        }
        fill={glass.body}
      />
      {/* Brillo lateral */}
      <path
        d="M46 120 c0 -14 8 -18 10 -28 v190 h-10 Z"
        fill={glass.shine}
        opacity="0.55"
      />
      {/* Etiqueta */}
      <rect x="42" y="176" width="56" height="72" rx="3" fill={labelBg} />
      <path
        d="M50 196 c6 -6 10 6 16 0s10 6 16 0 8 4 12 1"
        stroke={labelLine}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <rect x="50" y="214" width="40" height="3" rx="1.5" fill={labelLine} opacity="0.85" />
      <rect x="56" y="224" width="28" height="3" rx="1.5" fill={labelLine} opacity="0.5" />
      <rect x="42" y="240" width="56" height="8" rx="2" fill={accent} opacity="0.9" />
    </svg>
  );
}
