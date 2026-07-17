import React from "react";
import { Composition } from "remotion";
import { WBSPromo } from "./WBSPromo";
import { BOTTLES, DURATIONS, FPS } from "./theme";

// Suma de escenas menos el solape de cada transición (fade de 15f):
// intro + headline + 4*bottle + cta + outro - 7 transiciones
const TOTAL_DURATION =
  DURATIONS.intro +
  DURATIONS.headline +
  BOTTLES.length * DURATIONS.bottle +
  DURATIONS.cta +
  DURATIONS.outro -
  (3 + BOTTLES.length) * DURATIONS.transition;

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="WBSPromo"
      component={WBSPromo}
      durationInFrames={TOTAL_DURATION}
      fps={FPS}
      width={1080}
      height={1920}
    />
  );
};
