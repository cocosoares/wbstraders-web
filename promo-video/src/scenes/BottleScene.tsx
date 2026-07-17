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

  const bottleProgress = spring({ frame, fps, config: { damping: 16 } });
  const bottleY = interpolate(bottleProgress, [0, 1], [140, 0]);
  const bottleOpacity = interpolate(bottleProgress, [0, 1], [0, 1]);

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

      <div
        style={{
          transform: `translateY(${bottleY}px)`,
          opacity: bottleOpacity,
          height: 900,
          display: "flex",
          alignItems: "flex-end",
        }}
      >
        <Img src={staticFile(bottle.image)} style={{ height: 850 }} />
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
