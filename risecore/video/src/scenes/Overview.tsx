import React from 'react';
import {AbsoluteFill, Easing, Interactive, interpolate, useCurrentFrame} from 'remotion';
import {Background} from '../components/Background';
import {FONT} from '../fonts';
import {FrontChar} from '../rig/FrontChar';
import {v} from '../rig/math';
import {C, clamp} from '../theme';

const ROWS = [
  {n: '0', name: 'Khởi động', d: '5–10 phút'},
  {n: '1', name: 'Đẩy ngực ngang', d: '4 × 6–10'},
  {n: '2', name: 'Đẩy ghế dốc', d: '3 × 8–12'},
  {n: '3', name: 'Hít đất', d: '3 × gần max'},
  {n: '4', name: 'Ép ngực cáp', d: '3 × 12–15'},
];

export const Overview: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background a="#3DA5FF" b="#FF4D4D" />
      <Interactive.Div
        name="Badge"
        style={{
          position: 'absolute',
          top: 150,
          left: 80,
          padding: '8px 22px',
          borderRadius: 14,
          backgroundColor: '#FF4D4D',
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 38,
          letterSpacing: 2,
          color: '#FFFFFF',
        }}
      >
        GIÁO ÁN
      </Interactive.Div>
      <Interactive.Div
        name="Title"
        style={{
          position: 'absolute',
          top: 220,
          left: 80,
          right: 80,
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 96,
          color: '#FFFFFF',
          opacity: interpolate(frame, [0, 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        }}
      >
        4 bài · ~50 phút
      </Interactive.Div>
      <Interactive.Div
        name="Sub"
        style={{
          position: 'absolute',
          top: 345,
          left: 80,
          right: 80,
          fontFamily: FONT,
          fontWeight: 500,
          fontSize: 44,
          color: 'rgba(255,255,255,0.7)',
          opacity: interpolate(frame, [8, 20], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        }}
      >
        Hiệp × số lần lặp (rep) mỗi hiệp
      </Interactive.Div>

      {ROWS.map((r, i) => {
        const a = interpolate(frame, [18 + i * 8, 30 + i * 8], [0, 1], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)});
        return (
          <div
            key={r.n}
            style={{
              position: 'absolute',
              top: 440 + i * 140,
              left: 80,
              width: 920,
              height: 118,
              borderRadius: 30,
              background: i === 0 ? 'rgba(46,230,166,0.12)' : C.card,
              border: `2px solid ${i === 0 ? 'rgba(46,230,166,0.5)' : 'rgba(255,255,255,0.1)'}`,
              display: 'flex',
              alignItems: 'center',
              padding: '0 30px',
              gap: 26,
              boxSizing: 'border-box',
              opacity: a,
              translate: `${(1 - a) * 120}px 0px`,
            }}
          >
            <div
              style={{
                width: 70,
                height: 70,
                borderRadius: 35,
                background: i === 0 ? C.mint : C.red,
                color: i === 0 ? C.ink : '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: FONT,
                fontWeight: 900,
                fontSize: 40,
              }}
            >
              {i === 0 ? '↻' : r.n}
            </div>
            <div style={{flex: 1, fontFamily: FONT, fontWeight: 800, fontSize: 46, color: '#FFFFFF'}}>{r.name}</div>
            <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 40, color: C.yellow}}>{r.d}</div>
          </div>
        );
      })}

      <AbsoluteFill>
        <svg width={1080} height={1920} viewBox="0 0 1080 1920">
          <FrontChar
            who="coach"
            x={830}
            y={1560}
            s={0.55}
            mouth={frame > 30 && frame < 150 ? Math.abs(Math.sin(frame * 0.5)) : 0}
            handL={v(-150, -620)}
            mood="happy"
            blink={frame % 75 > 71}
          />
          <FrontChar who="ti" x={250} y={1560} s={0.55} mood="happy" handR={v(120, -330)} blink={frame % 64 > 60} />
        </svg>
      </AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          top: 1205,
          left: 340,
          width: 400,
          textAlign: 'center',
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 40,
          lineHeight: 1.3,
          color: 'rgba(255,255,255,0.85)',
          opacity: interpolate(frame, [70, 82], [0, 1], clamp),
        }}
      >
        Mới tập? Ưu tiên kỹ thuật hơn mức tạ.
      </div>
    </AbsoluteFill>
  );
};
