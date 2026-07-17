import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { COLORS, type BottleInfo } from "../theme";

const { fontFamily: playfair } = loadPlayfair("normal", {
  weights: ["600"],
  subsets: ["latin"],
});
const { fontFamily: inter } = loadInter("normal", {
  weights: ["500", "700"],
  subsets: ["latin"],
});

export const BottleScene: React.FC<{ bottle: BottleInfo; bg: string }> = ({
  bottle,
  bg,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animación de entrada de la botella
  const bottleProgress = spring({ frame, fps, config: { damping: 16 } });
  const bottleY = interpolate(bottleProgress, [0, 1], [140, 0]);
  const bottleOpacity = interpolate(bottleProgress, [0, 1], [0, 1]);

  // Efecto de flotación continua (float) y rotación orgánica
  const floatOffset = Math.sin(frame / 12) * 12;
  const scale = interpolate(bottleProgress, [0, 1], [0.8, 1]) * (1 + Math.sin(frame / 20) * 0.012);
  const rotate = interpolate(bottleProgress, [0, 1], [-8, 0]) + Math.cos(frame / 16) * 1.5;

  // Sombra física dinámica en base a la altura de la botella
  // Cuando flota más arriba (floatOffset negativo), la sombra es más pequeña y tenue.
  // Cuando baja (floatOffset positivo), la sombra es más grande y oscura.
  const shadowScale = interpolate(floatOffset, [-12, 12], [0.75, 1.05]);
  const shadowOpacity = interpolate(floatOffset, [-12, 12], [0.25, 0.45]);

  // Animaciones de texto y precio
  const textProgress = spring({
    frame: frame - 14,
    fps,
    config: { damping: 200 },
  });
  const textOpacity = interpolate(textProgress, [0, 1], [0, 1]);
  const textY = interpolate(textProgress, [0, 1], [16, 0]);

  const priceProgress = spring({
    frame: frame - 26,
    fps,
    config: { damping: 14 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Detalle decorativo de fondo - Círculo de luz suave detrás de la botella */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255, 250, 240, 0.08) 0%, rgba(255,250,240,0) 70%)",
          transform: "scale(1.5)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 90,
          fontFamily: inter,
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: 4,
          textTransform: "uppercase",
          color: COLORS.gold500,
          opacity: textOpacity,
        }}
      >
        {bottle.brand}
      </div>

      {/* Contenedor animado de la Botella + Sombra */}
      <div
        style={{
          transform: `translateY(${bottleY + floatOffset}px) scale(${scale}) rotate(${rotate}deg)`,
          transformOrigin: "bottom center",
          opacity: bottleOpacity,
          height: 900,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
          position: "relative",
          paddingBottom: 20,
        }}
      >
        {/* Botella */}
        <Img 
          src={staticFile(bottle.image)} 
          style={{ 
            height: 850, 
            zIndex: 2,
            filter: "drop-shadow(0 15px 25px rgba(0,0,0,0.3))" 
          }} 
        />
        
        {/* Sombra de contacto física y dinámica */}
        <div
          style={{
            position: "absolute",
            bottom: 12,
            width: 280,
            height: 20,
            background: "radial-gradient(ellipse at center, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 70%)",
            transform: `scale(${shadowScale})`,
            opacity: shadowOpacity * bottleOpacity,
            zIndex: 1,
            pointerEvents: "none",
          }}
        />
      </div>

      <div
        style={{
          marginTop: 26,
          fontFamily: playfair,
          fontSize: 50,
          fontWeight: 600,
          color: COLORS.cream50,
          opacity: textOpacity,
          transform: `translateY(${textY}px)`,
          textAlign: "center",
        }}
      >
        {bottle.name}
      </div>
      <div
        style={{
          marginTop: 6,
          fontFamily: inter,
          fontSize: 22,
          color: COLORS.cream200,
          opacity: textOpacity,
          textAlign: "center",
        }}
      >
        {bottle.note}
      </div>

      <div
        style={{
          marginTop: 22,
          transform: `scale(${priceProgress})`,
          backgroundColor: COLORS.wine600,
          color: COLORS.cream50,
          fontFamily: inter,
          fontWeight: 700,
          fontSize: 28,
          padding: "12px 32px",
          borderRadius: 999,
        }}
      >
        {bottle.price}
      </div>
    </AbsoluteFill>
  );
};
