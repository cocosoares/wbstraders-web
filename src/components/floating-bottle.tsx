"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { BottleArt } from "@/components/bottle-art";
import type { Product } from "@/types";

/**
 * Botella animada interactiva.
 * - Flotación vertical sutil e infinita.
 * - Rotación 3D (tilt) y movimiento de brillo (shine/gloss) que sigue al cursor.
 * - Escala y sombras dinámicas al pasar el mouse.
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
  const ref = useRef<HTMLDivElement>(null);

  // Valores de movimiento para la rotación 3D
  const rotateXVal = useMotionValue(0);
  const rotateYVal = useMotionValue(0);
  
  // Valores de movimiento para el brillo de vidrio (shine)
  const shineXVal = useMotionValue(-100);
  const shineYVal = useMotionValue(-100);
  const shineOpacityVal = useMotionValue(0);

  // Springs suaves para la rotación (tilt)
  const rotateX = useSpring(rotateXVal, { damping: 25, stiffness: 150 });
  const rotateY = useSpring(rotateYVal, { damping: 25, stiffness: 150 });

  // Springs suaves para el brillo
  const shineX = useSpring(shineXVal, { damping: 25, stiffness: 150 });
  const shineY = useSpring(shineYVal, { damping: 25, stiffness: 150 });
  const shineOpacity = useSpring(shineOpacityVal, { damping: 25, stiffness: 150 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Coordenadas normalizadas (-0.5 a 0.5) respecto al centro
    const mouseX = (e.clientX - rect.left) / width - 0.5;
    const mouseY = (e.clientY - rect.top) / height - 0.5;

    // Asignar inclinación máxima de 15 grados
    rotateXVal.set(-mouseY * 18);
    rotateYVal.set(mouseX * 18);

    // Mover el brillo siguiendo al cursor
    shineXVal.set(mouseX * 120);
    shineYVal.set(mouseY * 120);
    shineOpacityVal.set(0.35);
  };

  const handleMouseLeave = () => {
    rotateXVal.set(0);
    rotateYVal.set(0);
    shineXVal.set(-100);
    shineYVal.set(-100);
    shineOpacityVal.set(0);
  };

  return (
    <motion.div
      className={className}
      animate={{ y: [0, -10, 0] }}
      transition={{
        duration: 4.5,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        whileHover={{ scale: 1.05 }}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          perspective: 1000,
        }}
        className="relative flex h-full items-end justify-center cursor-pointer select-none"
      >
        {/* Glow de fondo de la botella */}
        <div className="absolute inset-0 -z-10 rounded-full bg-radial from-cream-100/10 to-transparent blur-xl pointer-events-none opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        
        {/* La botella con desplazamiento Z de 3D */}
        <div style={{ transform: "translateZ(30px)" }} className="relative flex h-full w-auto items-end justify-center">
          <BottleArt product={product} className="h-full w-auto drop-shadow-2xl" priority={priority} />
        </div>

        {/* Brillo diagonal interactivo */}
        <motion.div
          className="absolute inset-0 pointer-events-none mix-blend-overlay rounded-lg"
          style={{
            transform: "translateZ(45px)",
            opacity: shineOpacity,
            background: "linear-gradient(135deg, rgba(255,255,255,0) 20%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 80%)",
            backgroundSize: "200% 200%",
            x: shineX,
            y: shineY,
          }}
        />
      </motion.div>
    </motion.div>
  );
}
