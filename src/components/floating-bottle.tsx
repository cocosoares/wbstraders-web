"use client";

import { motion } from "framer-motion";
import { BottleArt } from "@/components/bottle-art";
import type { Product } from "@/types";

/**
 * Botella con flotación sutil e infinita. `delay` desfasa cada botella para
 * que el conjunto se mueva de forma orgánica, no sincronizada.
 */
export function FloatingBottle({
  product,
  className,
  delay = 0,
  priority = false,
}: {
  product: Product;
  className?: string;
  delay?: number;
  priority?: boolean;
}) {
  return (
    <motion.div
      className={className}
      animate={{ y: [0, -14, 0] }}
      transition={{
        duration: 4.5,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <BottleArt product={product} className="h-full w-auto" priority={priority} />
    </motion.div>
  );
}
