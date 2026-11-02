import React from 'react';
import {AbsoluteFill, Easing, Interactive, interpolate, useCurrentFrame} from 'remotion';
import {Background} from '../components/Background';
import {CoachHead} from '../components/CoachHead';
import {FONT} from '../fonts';
import {FlatBench} from '../rig/equipment';
import {COACH, TI} from '../rig/looks';
import {rep} from '../rig/math';
import {benchPose} from '../rig/poses';
import {PlateSide, SideLifter} from '../rig/SideLifter';
import {C, clamp} from '../theme';

export const SWITCH = 138;

export const Mistake: React.FC = () => {
  const frame = useCurrentFrame();
  const wrong = frame < SWITCH;
  const rw = rep(frame, 20, 26, 0.42);
  const lift = Math.max(0, (rw.v - 0.65) / 0.35);
  const rr = rep(frame, SWITCH + 10, 96, 0.7);
  const pose = wrong ? benchPose(TI, rw.v, lift) : benchPose(COACH, rr.v);
  const impact = wrong && rw.v > 0.93;
  const tag = wrong
    ? interpolate(frame, [30, 40], [0, 1], {...clamp, easing: Easing.spring({damping: 10})})
    : interpolate(frame, [SWITCH + 6, SWITCH + 16], [0, 1], {...clamp, easing: Easing.spring({damping: 10})});
  const fadeStage = interpolate(frame, [SWITCH - 6, SWITCH, SWITCH + 6], [1, 0, 1], clamp);

  return (
    <AbsoluteFill>
      <Background a={wrong ? '#FF4D4D' : '#2EE6A6'} />
      <Interactive.Div
        name="Badge"
        style={{
          position: 'absolute',
          top: 150,
          left: 80,
          padding: '8px 22px',
          borderRadius: 14,
          backgroundColor: '#FFD23F',
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 38,
          letterSpacing: 2,
          color: '#0E1220',
        }}
      >
        LỖI HAY GẶP
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
          fontSize: 92,
          lineHeight: 1.05,
          color: '#FFFFFF',
          opacity: interpolate(frame, [0, 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        }}
      >
        Đẩy ngực kiểu này là toang
      </Interactive.Div>

      <div
        style={{
          position: 'absolute',
          top: 465,
          left: 80,
          width: 920,
          height: 680,
          borderRadius: 40,
          background: 'rgba(255,255,255,0.05)',
          border: `4px solid ${wrong ? 'rgba(255,77,77,0.6)' : 'rgba(46,230,166,0.6)'}`,
          overflow: 'hidden',
        }}
      >
        <svg width={920} height={680} viewBox="0 0 920 680" style={{opacity: fadeStage}}>
          <rect x={0} y={600} width={920} height={80} fill="rgba(255,255,255,0.06)" />
          <FlatBench />
          <SideLifter look={wrong ? TI : COACH} pose={pose} prop={<PlateSide at={pose.hand} />} />
          {impact
            ? [0, 1, 2, 3, 4].map((k) => {
                const a = (-150 + k * 30) * (Math.PI / 180);
                return (
                  <line
                    key={k}
                    x1={pose.hand.x + Math.cos(a) * 80}
                    y1={pose.hand.y + Math.sin(a) * 80}
                    x2={pose.hand.x + Math.cos(a) * 110}
                    y2={pose.hand.y + Math.sin(a) * 110}
                    stroke="#FFD23F"
                    strokeWidth={8}
                    strokeLinecap="round"
                  />
                );
              })
            : null}
          {wrong && lift > 0.3 ? (
            <path d={`M 470 ${pose.hip.y + 60} L 470 ${pose.hip.y + 20} M 455 ${pose.hip.y + 35} L 470 ${pose.hip.y + 20} L 485 ${pose.hip.y + 35}`} stroke="#FF4D4D" strokeWidth={7} fill="none" strokeLinecap="round" />
          ) : null}
        </svg>
        <div
          style={{
            position: 'absolute',
            top: 26,
            left: 26,
            padding: '10px 26px',
            borderRadius: 18,
            background: wrong ? C.red : C.mint,
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: 48,
            color: wrong ? '#FFFFFF' : C.ink,
            scale: `${tag}`,
          }}
        >
          {wrong ? '✕ SAI' : '✓ ĐÚNG'}
        </div>
      </div>

      <div style={{position: 'absolute', top: 1185, left: 80, right: 80}}>
        {(wrong
          ? ['Nảy tạ khỏi ngực', 'Nhấc mông khỏi ghế']
          : ['Hạ chậm 2–3 giây', 'Mông luôn dính ghế']
        ).map((t, i) => {
          const st = wrong ? 40 : SWITCH + 14;
          const o = interpolate(frame, [st + i * 16, st + 10 + i * 16], [0, 1], clamp);
          return (
            <div
              key={t}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                marginBottom: 18,
                opacity: o,
                translate: `${(1 - o) * 40}px 0px`,
                fontFamily: FONT,
                fontWeight: 800,
                fontSize: 54,
                color: '#FFFFFF',
              }}
            >
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  background: wrong ? C.red : C.mint,
                  color: wrong ? '#FFFFFF' : C.ink,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 36,
                }}
              >
                {wrong ? '✕' : '✓'}
              </div>
              {t}
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: 'absolute',
          top: 1380,
          left: 80,
          right: 80,
          display: 'flex',
          alignItems: 'center',
          gap: 22,
          opacity: interpolate(frame, [SWITCH + 50, SWITCH + 62], [0, 1], clamp),
        }}
      >
        <CoachHead size={110} mouth={frame > SWITCH + 55 && frame < SWITCH + 120 ? Math.abs(Math.sin(frame * 0.5)) : 0} />
        <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 42, color: C.yellow, lineHeight: 1.25}}>
          Nặng quá mà phải ăn gian?
          <br />
          Giảm tạ đi nha!
        </div>
      </div>
    </AbsoluteFill>
  );
};
