import React from 'react';
import {AbsoluteFill, Easing, Interactive, interpolate, useCurrentFrame} from 'remotion';
import {Background} from '../components/Background';
import {CoachHead} from '../components/CoachHead';
import {FONT} from '../fonts';
import {C, clamp} from '../theme';

const pop = (frame: number, at: number) =>
  interpolate(frame, [at, at + 12], [0, 1], {...clamp, easing: Easing.bezier(0.34, 1.56, 0.64, 1)});

export const Nutrition: React.FC = () => {
  const frame = useCurrentFrame();
  const cx = 540;
  const cy = 700;
  const labels = [
    {t: 'Tinh bột: cơm, khoai', x: 80, y: 930, at: 40, c: C.yellow},
    {t: 'Đạm: gà, cá, trứng', x: 560, y: 440, at: 55, c: C.red},
    {t: 'Rau xanh', x: 110, y: 470, at: 70, c: C.mint},
  ];
  return (
    <AbsoluteFill>
      <Background a="#2EE6A6" b="#FFD23F" />
      <Interactive.Div
        name="Badge"
        style={{
          position: 'absolute',
          top: 150,
          left: 80,
          padding: '8px 22px',
          borderRadius: 14,
          backgroundColor: '#2EE6A6',
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 38,
          letterSpacing: 2,
          color: '#0E1220',
        }}
      >
        SAU BUỔI TẬP
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
        Ăn gì để lên cơ?
      </Interactive.Div>

      <AbsoluteFill>
        <svg width={1080} height={1920} viewBox="0 0 1080 1920">
          <g transform={`translate(${cx} ${cy}) scale(${pop(frame, 10)})`}>
            <circle r={250} fill="#DDE2EE" />
            <circle r={215} fill="#FFFFFF" />
            {/* rice */}
            <g transform={`translate(-70 70) scale(${pop(frame, 40)})`}>
              <ellipse rx={110} ry={80} fill="#F6F1E3" />
              {Array.from({length: 18}).map((_, i) => (
                <ellipse key={i} cx={-80 + (i % 6) * 32} cy={-40 + Math.floor(i / 6) * 34} rx={10} ry={6} fill="#E9E1C9" transform={`rotate(${i * 37})`} />
              ))}
            </g>
            {/* chicken */}
            <g transform={`translate(90 -10) rotate(-20) scale(${pop(frame, 55)})`}>
              <rect x={-80} y={-55} width={160} height={110} rx={50} fill="#D9894A" />
              {[-40, 0, 40].map((x) => (
                <line key={x} x1={x - 20} y1={-40} x2={x + 20} y2={40} stroke="#A85E2A" strokeWidth={10} strokeLinecap="round" />
              ))}
            </g>
            {/* egg */}
            <g transform={`translate(70 130) scale(${pop(frame, 62)})`}>
              <ellipse rx={58} ry={46} fill="#FFFFFF" stroke="#EEE" strokeWidth={3} />
              <circle r={22} fill="#FFC23A" />
            </g>
            {/* greens */}
            <g transform={`translate(-80 -110) scale(${pop(frame, 70)})`}>
              {[
                [-40, 0],
                [0, -20],
                [40, 0],
                [-10, 25],
                [30, 30],
              ].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={30} fill={i % 2 ? '#3CBF6B' : '#2E9E57'} />
              ))}
            </g>
          </g>
        </svg>
      </AbsoluteFill>

      {labels.map((l) => {
        const a = pop(frame, l.at + 6);
        return (
          <div
            key={l.t}
            style={{
              position: 'absolute',
              left: l.x,
              top: l.y,
              padding: '12px 24px',
              borderRadius: 999,
              background: l.c,
              fontFamily: FONT,
              fontWeight: 800,
              fontSize: 38,
              color: C.ink,
              scale: `${a}`,
              boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
            }}
          >
            {l.t}
          </div>
        );
      })}

      <div
        style={{
          position: 'absolute',
          top: 1010,
          left: 80,
          right: 80,
          borderRadius: 32,
          background: C.card,
          border: '2px solid rgba(255,255,255,0.12)',
          padding: '26px 36px',
          opacity: pop(frame, 110),
          translate: `0px ${(1 - pop(frame, 110)) * 40}px`,
        }}
      >
        <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 38, color: C.muted}}>Đạm mỗi ngày</div>
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 84, color: C.yellow, lineHeight: 1.15}}>1,6–2,2g / kg</div>
        <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 38, color: '#FFFFFF'}}>Nặng 60kg → khoảng 95–130g đạm</div>
      </div>

      <div style={{position: 'absolute', top: 1295, left: 80, right: 80, display: 'flex', gap: 20}}>
        {[
          {t: 'Uống đủ nước', icon: 'M12 2C9 7 6 10 6 14a6 6 0 0 0 12 0c0-4-3-7-6-12z', c: C.blue},
          {t: 'Ngủ 7–9 tiếng', icon: 'M20 15A8 8 0 1 1 9 4a7 7 0 0 0 11 11z', c: C.yellow},
        ].map((x, i) => (
          <div
            key={x.t}
            style={{
              flex: 1,
              height: 100,
              borderRadius: 26,
              background: 'rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              fontFamily: FONT,
              fontWeight: 800,
              fontSize: 40,
              color: '#FFFFFF',
              opacity: pop(frame, 150 + i * 12),
            }}
          >
            <svg width={44} height={44} viewBox="0 0 24 24">
              <path d={x.icon} fill={x.c} />
            </svg>
            {x.t}
          </div>
        ))}
      </div>

      <div
        style={{
          position: 'absolute',
          top: 1425,
          left: 80,
          right: 80,
          display: 'flex',
          alignItems: 'center',
          gap: 22,
          opacity: pop(frame, 190),
        }}
      >
        <CoachHead size={110} mouth={frame > 195 && frame < 290 ? Math.abs(Math.sin(frame * 0.5)) : 0} />
        <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 42, color: C.mint, lineHeight: 1.25}}>
          Cơ lớn lên lúc nghỉ,
          <br />
          không phải lúc tập!
        </div>
      </div>
    </AbsoluteFill>
  );
};
