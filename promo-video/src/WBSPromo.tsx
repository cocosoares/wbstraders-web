import React from "react";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { IntroScene } from "./scenes/IntroScene";
import { HeadlineScene } from "./scenes/HeadlineScene";
import { BottleScene } from "./scenes/BottleScene";
import { CTAScene } from "./scenes/CTAScene";
import { OutroScene } from "./scenes/OutroScene";
import { BOTTLES, COLORS, DURATIONS } from "./theme";

const BOTTLE_BACKGROUNDS = [
  COLORS.olive900,
  COLORS.ink900,
  COLORS.olive800,
  COLORS.ink700,
];

const transition = () => (
  <TransitionSeries.Transition
    presentation={fade()}
    timing={linearTiming({ durationInFrames: DURATIONS.transition })}
  />
);

export const WBSPromo: React.FC = () => {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={DURATIONS.intro}>
        <IntroScene />
      </TransitionSeries.Sequence>
      {transition()}

      <TransitionSeries.Sequence durationInFrames={DURATIONS.headline}>
        <HeadlineScene />
      </TransitionSeries.Sequence>
      {transition()}

      {BOTTLES.map((bottle, index) => (
        <React.Fragment key={bottle.name}>
          <TransitionSeries.Sequence durationInFrames={DURATIONS.bottle}>
            <BottleScene bottle={bottle} bg={BOTTLE_BACKGROUNDS[index]} />
          </TransitionSeries.Sequence>
          {transition()}
        </React.Fragment>
      ))}

      <TransitionSeries.Sequence durationInFrames={DURATIONS.cta}>
        <CTAScene />
      </TransitionSeries.Sequence>
      {transition()}

      <TransitionSeries.Sequence durationInFrames={DURATIONS.outro}>
        <OutroScene />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
