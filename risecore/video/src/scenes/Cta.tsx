import React from 'react';
import {AbsoluteFill, Easing, Interactive, interpolate, useCurrentFrame} from 'remotion';
import {Background} from '../components/Background';
import {FONT} from '../fonts';
import {FrontChar} from '../rig/FrontChar';
import {lerpV, v} from '../rig/math';
import {clamp} from '../theme';

export const HIGH_FIVE = 42;

export const Cta: React.FC = () => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [20, HIGH_FIVE], [0, 1], {...clamp, easing: Easing.bezier(0.5, 0, 0.75, 0)});
  const tiR = lerpV(v(80, -240), v(150, -585), t);
  const coL = lerpV(v(-104, -245), v(-150, -585), t);
  const burst = interpolate(frame, [HIGH_FIVE, HIGH_FIVE + 16], [0, 1], clamp);
  const talk = frame > 50 && frame < 180 ? Math.abs(Math.sin(frame * 0.5)) : 0;
  return (
    <AbsoluteFill>
      <Background a="#FFD23F" b="#FF4D4D" />
      <Interactive.Div
        name="Follow"
        style={{
          position: 'absolute',
          top: 200,
          left: 80,
          right: 80,
          textAlign: 'center',
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: 66,
          color: '#FFFFFF',
          opacity: interpolate(frame, [4, 16], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        }}
      >
        Follow để xem tiếp
      </Interactive.Div>
      <Interactive.Div
        name="Next day"
        style={{
          position: 'absolute',
          top: 285,
          left: 40,
          right: 40,
          textAlign: 'center',
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 104,
          lineHeight: 1,
          letterSpacing: -2,
          color: '#FFD23F',
          textShadow: '0 10px 0 #FF4D4D',
          scale: interpolate(frame, [10, 24], [0.4, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.spring({damping: 10}),
            output: 'perceptual-scale',
          }),
        }}
      >
        NGÀY TẬP LƯNG
      </Interactive.Div>
      <Interactive.Div
        name="Save"
        style={{
          position: 'absolute',
          top: 420,
          left: 80,
          right: 80,
          textAlign: 'center',
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 46,
          color: 'rgba(255,255,255,0.85)',
          opacity: interpolate(frame, [60, 72], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        }}
      >
        Lưu lại, mang lên phòng gym nha!
      </Interactive.Div>
      <AbsoluteFill>
        <svg width={1080} height={1920} viewBox="0 0 1080 1920">
          <ellipse cx={380} cy={1505} rx={100} ry={16} fill="rgba(0,0,0,0.35)" />
          <ellipse cx={720} cy={1505} rx={120} ry={18} fill="rgba(0,0,0,0.35)" />
          <FrontChar who="ti" x={380} y={1500} s={1.15} handR={tiR} mood="happy" mouth={talk * 0.6} blink={frame % 66 > 62} />
          <FrontChar who="coach" x={720} y={1500} s={1.15} handL={coL} mood={frame > HIGH_FIVE ? 'proud' : 'happy'} mouth={talk} blink={frame % 80 > 76} />
          {burst > 0 && burst < 1
            ? Array.from({length: 8}).map((_, k) => {
                const a = (k / 8) * Math.PI * 2;
                const r1 = 40 + burst * 60;
                const r2 = r1 + 40 * (1 - burst);
                return (
                  <line
                    key={k}
                    x1={552 + Math.cos(a) * r1}
                    y1={828 + Math.sin(a) * r1}
                    x2={552 + Math.cos(a) * r2}
                    y2={828 + Math.sin(a) * r2}
                    stroke="#FFD23F"
                    strokeWidth={10}
                    strokeLinecap="round"
                  />
                );
              })
            : null}
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
