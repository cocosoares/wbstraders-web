import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { LogoIcon, Wordmark } from "../Logo";
import { COLORS } from "../theme";

const { fontFamily: inter } = loadInter("normal", {
  weights: ["500", "700"],
  subsets: ["latin"],
});

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({ frame, fps, config: { damping: 200 } });
  const opacity = interpolate(progress, [0, 1], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.cream100,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ opacity, transform: `scale(${0.9 + progress * 0.1})` }}>
        <LogoIcon size={90} color={COLORS.ink900} />
      </div>
      <div style={{ marginTop: 18, opacity }}>
        <Wordmark size={56} dark />
      </div>
      <div
        style={{
          marginTop: 24,
          fontFamily: inter,
          fontWeight: 600,
          fontSize: 24,
          color: COLORS.wine600,
          opacity,
          letterSpacing: 1,
        }}
      >
        wbstraders.pe
      </div>
      <div
        style={{
          marginTop: 8,
          fontFamily: inter,
          fontSize: 20,
          color: COLORS.ink500,
          opacity,
        }}
      >
        @wbstraders
      </div>
    </AbsoluteFill>
  );
};
