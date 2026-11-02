import React from 'react';
import {interpolate, Sequence, staticFile, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import {linearTiming, TransitionSeries} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {slide} from '@remotion/transitions/slide';
import './fonts';
import {Hook} from './scenes/Hook';
import {Overview} from './scenes/Overview';
import {Warmup} from './scenes/Warmup';
import {Bench, BENCH_REP} from './scenes/Bench';
import {Incline, INCLINE_REP} from './scenes/Incline';
import {Pushup, PUSHUP_REP} from './scenes/Pushup';
import {Fly, FLY_REP} from './scenes/Fly';
import {Mistake, SWITCH} from './scenes/Mistake';
import {Nutrition} from './scenes/Nutrition';
import {Cta, HIGH_FIVE} from './scenes/Cta';

const T = 12;
export const DURS = [210, 180, 240, 330, 300, 270, 300, 270, 330, 210];
export const STARTS = DURS.map((_, i) => DURS.slice(0, i).reduce((a, b) => a + b, 0) - i * T);
export const TOTAL = DURS.reduce((a, b) => a + b, 0) - (DURS.length - 1) * T;

const repTicks = (sceneStart: number, r: {start: number; period: number}, dur: number) => {
  const out: number[] = [];
  for (let f = r.start + r.period; f < dur - 6; f += r.period) out.push(sceneStart + f);
  return out;
};

export const GymVideo: React.FC = () => {
  const {durationInFrames} = useVideoConfig();
  const ticks = [
    ...repTicks(STARTS[3], BENCH_REP, DURS[3]),
    ...repTicks(STARTS[4], INCLINE_REP, DURS[4]),
    ...repTicks(STARTS[5], PUSHUP_REP, DURS[5]),
    ...repTicks(STARTS[6], FLY_REP, DURS[6]),
  ];
  return (
    <>
      <TransitionSeries>
        <TransitionSeries.Sequence name="Hook" durationInFrames={210}>
          <Hook />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({direction: 'from-bottom'})} timing={linearTiming({durationInFrames: T})} />
        <TransitionSeries.Sequence name="Overview" durationInFrames={180}>
          <Overview />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({direction: 'from-right'})} timing={linearTiming({durationInFrames: T})} />
        <TransitionSeries.Sequence name="Warm-up" durationInFrames={240}>
          <Warmup />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({direction: 'from-right'})} timing={linearTiming({durationInFrames: T})} />
        <TransitionSeries.Sequence name="Bench" durationInFrames={330}>
          <Bench />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({direction: 'from-right'})} timing={linearTiming({durationInFrames: T})} />
        <TransitionSeries.Sequence name="Incline" durationInFrames={300}>
          <Incline />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({direction: 'from-right'})} timing={linearTiming({durationInFrames: T})} />
        <TransitionSeries.Sequence name="Push-up" durationInFrames={270}>
          <Pushup />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({direction: 'from-right'})} timing={linearTiming({durationInFrames: T})} />
        <TransitionSeries.Sequence name="Cable fly" durationInFrames={300}>
          <Fly />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: T})} />
        <TransitionSeries.Sequence name="Mistake" durationInFrames={270}>
          <Mistake />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({direction: 'from-right'})} timing={linearTiming({durationInFrames: T})} />
        <TransitionSeries.Sequence name="Nutrition" durationInFrames={330}>
          <Nutrition />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({direction: 'from-bottom'})} timing={linearTiming({durationInFrames: T})} />
        <TransitionSeries.Sequence name="CTA" durationInFrames={210}>
          <Cta />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      <Audio
        name="Music"
        src={staticFile('audio/music.wav')}
        volume={(f) => interpolate(f, [0, 15, durationInFrames - 45, durationInFrames], [0, 0.42, 0.42, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}
      />
      {STARTS.slice(1).map((s) => (
        <Sequence key={`w${s}`} name="Whoosh" from={s - 8} durationInFrames={20}>
          <Audio src={staticFile('audio/whoosh.wav')} volume={0.45} />
        </Sequence>
      ))}
      {ticks.map((f) => (
        <Sequence key={`t${f}`} name="Rep tick" from={f} durationInFrames={8}>
          <Audio src={staticFile('audio/tick.wav')} volume={0.4} />
        </Sequence>
      ))}
      {[8, 98].map((f) => (
        <Sequence key={`b${f}`} name="Bubble pop" from={f} durationInFrames={10}>
          <Audio src={staticFile('audio/pop.wav')} volume={0.55} />
        </Sequence>
      ))}
      <Sequence name="Coach slide" from={64} durationInFrames={20}>
        <Audio src={staticFile('audio/whoosh.wav')} volume={0.4} />
      </Sequence>
      {Array.from({length: 5}).map((_, i) => (
        <Sequence key={`ov${i}`} name="List pop" from={STARTS[1] + 18 + i * 8} durationInFrames={8}>
          <Audio src={staticFile('audio/pop.wav')} volume={0.3} />
        </Sequence>
      ))}
      <Sequence name="Wrong buzz" from={STARTS[7] + 30} durationInFrames={20}>
        <Audio src={staticFile('audio/buzz.wav')} volume={0.5} />
      </Sequence>
      <Sequence name="Right ding" from={STARTS[7] + SWITCH + 6} durationInFrames={30}>
        <Audio src={staticFile('audio/ding.wav')} volume={0.5} />
      </Sequence>
      <Sequence name="High five" from={STARTS[9] + HIGH_FIVE} durationInFrames={15}>
        <Audio src={staticFile('audio/clap.wav')} volume={0.8} />
      </Sequence>
    </>
  );
};
