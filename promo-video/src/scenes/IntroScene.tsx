import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { LogoIcon, Wordmark } from "../Logo";
import { COLORS } from "../theme";

const { fontFamily: playfair } = loadPlayfair("normal", {
  weights: ["600"],
  subsets: ["latin"],
});
const { fontFamily: inter } = loadInter("normal", {
  weights: ["500"],
  subsets: ["latin"],
});

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const iconScale = spring({ frame, fps, config: { damping: 12 } });
  const wordmarkOpacity = spring({
    frame: frame - 12,
    fps,
    config: { damping: 200 },
  });
  const wordmarkY = spring({
    frame: frame - 12,
    fps,
    config: { damping: 200 },
  });

  const tagline = "Vinos de autor argentinos";
  const taglineProgress = spring({
    frame: frame - 30,
    fps,
    durationInFrames: 30,
    config: { damping: 200 },
  });
  const taglineChars = Math.round(taglineProgress * tagline.length);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.olive900,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ transform: `scale(${iconScale})` }}>
        <LogoIcon size={140} />
      </div>
      <div
        style={{
          marginTop: 28,
          opacity: wordmarkOpacity,
          transform: `translateY(${(1 - wordmarkY) * 20}px)`,
          fontFamily: playfair,
        }}
      >
        <Wordmark size={72} />
      </div>
      <div
        style={{
          marginTop: 18,
          fontFamily: inter,
          fontSize: 28,
          letterSpacing: 2,
          color: COLORS.cream200,
          height: 36,
        }}
      >
        {tagline.slice(0, taglineChars)}
      </div>
    </AbsoluteFill>
  );
};
