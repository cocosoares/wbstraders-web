import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { getProductVisualPalette } from "@/lib/product-visuals";
import type { Product } from "@/types";

type ProductStageStyle = CSSProperties & {
  "--stage-highlight": string;
  "--stage-middle": string;
  "--stage-depth": string;
  "--stage-glow": string;
  "--stage-shadow": string;
};

export function ProductImageStage({
  product,
  children,
  className,
}: {
  product: Product;
  children: ReactNode;
  className?: string;
}) {
  const palette = getProductVisualPalette(product);
  const style: ProductStageStyle = {
    "--stage-highlight": palette.highlight,
    "--stage-middle": palette.middle,
    "--stage-depth": palette.depth,
    "--stage-glow": palette.glow,
    "--stage-shadow": palette.shadow,
  };

  return (
    <div
      style={style}
      className={cn(
        "relative isolate overflow-hidden bg-[radial-gradient(circle_at_50%_24%,var(--stage-highlight)_0%,var(--stage-middle)_52%,var(--stage-depth)_100%)] ring-1 ring-inset ring-white/25",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[5%] left-1/2 h-[68%] w-[72%] -translate-x-1/2 rounded-full bg-[var(--stage-glow)]/45 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(118deg,rgba(255,255,255,0.24)_0%,transparent_30%,transparent_72%,rgba(0,0,0,0.12)_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[3%] left-1/2 h-[7%] w-[46%] -translate-x-1/2 rounded-full bg-[var(--stage-shadow)]/50 blur-lg"
      />
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
}
