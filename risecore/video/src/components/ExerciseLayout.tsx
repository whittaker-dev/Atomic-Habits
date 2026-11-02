import React from 'react';
import {AbsoluteFill, Easing, Interactive, interpolate, useCurrentFrame} from 'remotion';
import {FONT} from '../fonts';
import {C, clamp} from '../theme';
import {Background} from './Background';
import {CoachHead} from './CoachHead';

export const ExerciseLayout: React.FC<{
  step: number; // 0 = warm-up, 1..4 = exercises
  badge: string;
  title: string;
  en: string;
  stats: {v: string; l: string}[];
  cues: string[];
  reps?: number | null;
  children: React.ReactNode;
}> = ({step, badge, title, en, stats, cues, reps, children}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background />
      <div style={{position: 'absolute', top: 110, left: 80, right: 80, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: 30,
            letterSpacing: 2,
            color: C.yellow,
            padding: '10px 22px',
            border: `3px solid ${C.yellow}`,
            borderRadius: 999,
          }}
        >
          NGÀY TẬP NGỰC
        </div>
        <div style={{display: 'flex', gap: 10}}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                width: 56,
                height: 12,
                borderRadius: 6,
                background: i < step ? 'rgba(255,255,255,0.85)' : i === step ? C.red : 'rgba(255,255,255,0.18)',
              }}
            />
          ))}
        </div>
      </div>

      <Interactive.Div
        name="Badge"
        style={{
          position: 'absolute',
          top: 222,
          left: 80,
          padding: '8px 22px',
          borderRadius: 14,
          backgroundColor: '#FF4D4D',
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 38,
          letterSpacing: 2,
          color: '#FFFFFF',
          scale: interpolate(frame, [0, 14], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.spring({damping: 12}),
            output: 'perceptual-scale',
          }),
        }}
      >
        {badge}
      </Interactive.Div>
      <Interactive.Div
        name="Title"
        style={{
          position: 'absolute',
          top: 290,
          left: 80,
          right: 80,
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 92,
          lineHeight: 1.05,
          color: '#FFFFFF',
          opacity: interpolate(frame, [4, 16], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
          translate: interpolate(frame, [4, 16], ['0px 40px', '0px 0px'], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        {title}
      </Interactive.Div>
      <Interactive.Div
        name="English name"
        style={{
          position: 'absolute',
          top: 392,
          left: 80,
          right: 80,
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 40,
          color: 'rgba(255,255,255,0.6)',
          opacity: interpolate(frame, [10, 22], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        }}
      >
        {en}
      </Interactive.Div>

      {/* stage */}
      <div
        style={{
          position: 'absolute',
          top: 465,
          left: 80,
          width: 920,
          height: 680,
          borderRadius: 40,
          background: 'rgba(255,255,255,0.05)',
          border: '2px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
          opacity: interpolate(frame, [6, 18], [0, 1], clamp),
        }}
      >
        <svg width={920} height={680} viewBox="0 0 920 680">
          <rect x={0} y={600} width={920} height={80} fill="rgba(255,255,255,0.06)" />
          <line x1={0} x2={920} y1={600} y2={600} stroke="rgba(255,255,255,0.18)" strokeWidth={3} />
          {children}
        </svg>
        {reps !== null && reps !== undefined ? (
          <div
            style={{
              position: 'absolute',
              top: 24,
              right: 24,
              padding: '10px 22px',
              borderRadius: 18,
              background: C.yellow,
              fontFamily: FONT,
              fontWeight: 900,
              fontSize: 40,
              color: C.ink,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            REP {reps}
          </div>
        ) : null}
      </div>

      {/* stats */}
      <div style={{position: 'absolute', top: 1170, left: 80, right: 80, display: 'flex', gap: 18}}>
        {stats.map((s, i) => {
          const a = interpolate(frame, [24 + i * 6, 36 + i * 6], [0, 1], {...clamp, easing: Easing.spring({damping: 12})});
          return (
            <div
              key={s.l}
              style={{
                flex: 1,
                height: 140,
                borderRadius: 28,
                background: C.card,
                border: '2px solid rgba(255,255,255,0.1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: a,
                scale: `${0.7 + 0.3 * a}`,
              }}
            >
              <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 54, color: i === 0 ? C.red : i === 1 ? C.yellow : C.mint, lineHeight: 1.1}}>
                {s.v}
              </div>
              <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 30, color: C.muted}}>{s.l}</div>
            </div>
          );
        })}
      </div>

      {/* coach cues */}
      <div style={{position: 'absolute', top: 1340, left: 80, right: 80, display: 'flex', gap: 24, alignItems: 'flex-start'}}>
        <div style={{opacity: interpolate(frame, [50, 60], [0, 1], clamp), flexShrink: 0}}>
          <CoachHead size={120} mouth={frame > 55 && frame < 200 ? Math.abs(Math.sin(frame * 0.55)) : 0} />
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 6}}>
          {cues.map((c, i) => {
            const o = interpolate(frame, [58 + i * 30, 70 + i * 30], [0, 1], clamp);
            return (
              <div
                key={c}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  opacity: o,
                  translate: `${(1 - o) * 40}px 0px`,
                  fontFamily: FONT,
                  fontWeight: 700,
                  fontSize: 42,
                  color: '#FFFFFF',
                }}
              >
                <div style={{width: 18, height: 18, borderRadius: 9, background: C.mint, flexShrink: 0}} />
                {c}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
