import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { COLORS } from "../theme";

const { fontFamily: playfair } = loadPlayfair("normal", {
  weights: ["600"],
  subsets: ["latin"],
});
const { fontFamily: inter } = loadInter("normal", {
  weights: ["500", "700"],
  subsets: ["latin"],
});

const PAYMENTS = ["Yape", "Plin", "Tarjetas", "BCP"];

export const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headlineProgress = spring({ frame, fps, config: { damping: 200 } });
  const subProgress = spring({
    frame: frame - 10,
    fps,
    config: { damping: 200 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.olive900,
        alignItems: "center",
        justifyContent: "center",
        padding: "0 80px",
      }}
    >
      <div
        style={{
          fontFamily: inter,
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: 4,
          textTransform: "uppercase",
          color: COLORS.gold500,
          opacity: headlineProgress,
        }}
      >
        Delivery en Lima
      </div>
      <div
        style={{
          marginTop: 18,
          fontFamily: playfair,
          fontSize: 68,
          fontWeight: 600,
          color: COLORS.cream50,
          textAlign: "center",
          lineHeight: 1.15,
          opacity: headlineProgress,
          transform: `translateY(${interpolate(headlineProgress, [0, 1], [20, 0])}px)`,
        }}
      >
        Recíbelo en tu casa en 24 horas
      </div>

      <div
        style={{
          marginTop: 44,
          display: "flex",
          gap: 14,
          opacity: subProgress,
          transform: `translateY(${interpolate(subProgress, [0, 1], [16, 0])}px)`,
        }}
      >
        {PAYMENTS.map((method) => (
          <div
            key={method}
            style={{
              fontFamily: inter,
              fontWeight: 600,
              fontSize: 22,
              color: COLORS.olive900,
              backgroundColor: COLORS.cream50,
              padding: "10px 22px",
              borderRadius: 999,
            }}
          >
            {method}
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 40,
          fontFamily: inter,
          fontSize: 24,
          color: COLORS.olive100,
          opacity: subProgress,
        }}
      >
        Zona 1 · envío gratis desde S/ 250
      </div>
    </AbsoluteFill>
  );
};
