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
  weights: ["400", "600"],
  subsets: ["latin"],
});

const Line: React.FC<{
  text: string;
  delay: number;
  color: string;
}> = ({ text, delay, color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200 },
  });
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const y = interpolate(progress, [0, 1], [24, 0]);

  return (
    <div
      style={{
        fontFamily: playfair,
        fontSize: 64,
        fontWeight: 600,
        lineHeight: 1.15,
        color,
        opacity,
        transform: `translateY(${y}px)`,
        textAlign: "center",
      }}
    >
      {text}
    </div>
  );
};

export const HeadlineScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const subOpacity = spring({
    frame: frame - 45,
    fps,
    config: { damping: 200 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.cream100,
        alignItems: "center",
        justifyContent: "center",
        padding: "0 90px",
      }}
    >
      <Line text="Los vinos de los" delay={0} color={COLORS.ink900} />
      <Line text="mejores restaurantes," delay={10} color={COLORS.ink900} />
      <Line text="ahora en tu mesa" delay={20} color={COLORS.wine600} />

      <div
        style={{
          marginTop: 40,
          fontFamily: inter,
          fontSize: 26,
          color: COLORS.ink500,
          opacity: subOpacity,
          textAlign: "center",
        }}
      >
        Vinos importados de Argentina · Delivery en Lima
      </div>
    </AbsoluteFill>
  );
};
