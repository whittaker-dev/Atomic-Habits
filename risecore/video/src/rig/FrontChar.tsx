import React from 'react';
import {V, ik, lerpV, v} from './math';

type Mood = 'happy' | 'sad' | 'shock' | 'proud';

type Dims = {
  shW: number;
  hipW: number;
  shY: number;
  hipY: number;
  headY: number;
  R: number;
  upper: number;
  fore: number;
  armW: number;
  foreW: number;
  legW: number;
};

type Who = 'coach' | 'ti' | 'mia';

const D: Record<Who, Dims> = {
  coach: {shW: 94, hipW: 50, shY: -440, hipY: -255, headY: -530, R: 68, upper: 108, fore: 100, armW: 38, foreW: 31, legW: 46},
  ti: {shW: 70, hipW: 44, shY: -425, hipY: -250, headY: -512, R: 66, upper: 98, fore: 92, armW: 27, foreW: 23, legW: 36},
  mia: {shW: 64, hipW: 44, shY: -430, hipY: -252, headY: -516, R: 64, upper: 98, fore: 92, armW: 24, foreW: 21, legW: 33},
};

const COL = {
  coach: {skin: '#D99A6C', shade: '#B87C52', top: '#FF4D4D', topDark: '#C93636', shorts: '#20253D', hair: '#18181C', shoe: '#F4F4F4'},
  ti: {skin: '#F2C29B', shade: '#D9A47D', top: '#3DA5FF', topDark: '#2B7FCC', shorts: '#3A3560', hair: '#3B2A20', shoe: '#FF8A3D'},
  mia: {skin: '#F6D2B8', shade: '#DDB094', top: '#2EE6A6', topDark: '#1FAF7E', shorts: '#2B3A67', hair: '#E2A93B', shoe: '#FFFFFF'},
};

const Limb: React.FC<{a: V; b: V; w: number; c: string}> = ({a, b, w, c}) => (
  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={c} strokeWidth={w} strokeLinecap="round" />
);

export const FrontChar: React.FC<{
  who: Who;
  x: number;
  y: number;
  s?: number;
  /** hand targets in local coords (feet at 0,0) */
  handL?: V;
  handR?: V;
  /** 0 closed .. 1 wide open (talking) */
  mouth?: number;
  mood?: Mood;
  blink?: boolean;
  tilt?: number;
  flip?: boolean;
}> = ({who, x, y, s = 1, handL, handR, mouth = 0, mood = 'happy', blink = false, tilt = 0, flip = false}) => {
  const d = D[who];
  const c = COL[who];
  const shL = v(-d.shW + 16, d.shY + 16);
  const shR = v(d.shW - 16, d.shY + 16);
  const hL = handL ?? v(-d.shW - 10, d.hipY + 10);
  const hR = handR ?? v(d.shW + 10, d.hipY + 10);
  const outL = (a: V, b: V) => (a.x < b.x ? a : b);
  const outR = (a: V, b: V) => (a.x > b.x ? a : b);
  const L = ik(shL, hL, d.upper, d.fore, outL);
  const Rr = ik(shR, hR, d.upper, d.fore, outR);
  const R = d.R;
  const hy = d.headY;
  const eyeRy = blink ? 1.5 : 10;

  const torso = `M ${-d.shW} ${d.shY + 22} Q ${-d.shW} ${d.shY - 6} ${-d.shW + 34} ${d.shY - 10} L ${d.shW - 34} ${d.shY - 10} Q ${d.shW} ${d.shY - 6} ${d.shW} ${d.shY + 22} L ${d.hipW + 10} ${d.hipY} L ${-d.hipW - 10} ${d.hipY} Z`;

  const browY = hy - 24;
  const brow =
    mood === 'sad'
      ? [`M ${-R * 0.55} ${browY + 2} L ${-R * 0.18} ${browY - 8}`, `M ${R * 0.55} ${browY + 2} L ${R * 0.18} ${browY - 8}`]
      : mood === 'shock'
        ? [`M ${-R * 0.55} ${browY - 12} Q ${-R * 0.36} ${browY - 20} ${-R * 0.16} ${browY - 12}`, `M ${R * 0.55} ${browY - 12} Q ${R * 0.36} ${browY - 20} ${R * 0.16} ${browY - 12}`]
        : mood === 'proud'
          ? [`M ${-R * 0.55} ${browY - 2} L ${-R * 0.16} ${browY + 4}`, `M ${R * 0.55} ${browY - 2} L ${R * 0.16} ${browY + 4}`]
          : [`M ${-R * 0.55} ${browY} Q ${-R * 0.36} ${browY - 9} ${-R * 0.16} ${browY - 2}`, `M ${R * 0.55} ${browY} Q ${R * 0.36} ${browY - 9} ${R * 0.16} ${browY - 2}`];

  const mouthY = hy + R * 0.45;
  let mouthEl: React.ReactNode;
  if (mouth > 0.05 || mood === 'shock') {
    const ry = mood === 'shock' ? 12 + mouth * 6 : 3 + mouth * 13;
    mouthEl = (
      <g>
        <ellipse cx={0} cy={mouthY} rx={mood === 'shock' ? 11 : 17} ry={ry} fill="#5A1A1A" />
        <ellipse cx={0} cy={mouthY + ry * 0.45} rx={9} ry={ry * 0.35} fill="#FF7A7A" />
      </g>
    );
  } else if (mood === 'sad') {
    mouthEl = <path d={`M -16 ${mouthY + 6} Q 0 ${mouthY - 6} 16 ${mouthY + 6}`} stroke="#5A1A1A" strokeWidth={6} fill="none" strokeLinecap="round" />;
  } else {
    mouthEl = <path d={`M -20 ${mouthY - 4} Q 0 ${mouthY + 14} 20 ${mouthY - 4}`} stroke="#5A1A1A" strokeWidth={6} fill="none" strokeLinecap="round" />;
  }

  const hair =
    who === 'coach' ? (
      <g>
        <path
          d={`M ${-R} ${hy - 4} Q ${-R} ${hy - R - 14} 0 ${hy - R - 16} Q ${R} ${hy - R - 14} ${R} ${hy - 4} Q ${R * 0.7} ${hy - R * 0.5} 0 ${hy - R * 0.58} Q ${-R * 0.7} ${hy - R * 0.5} ${-R} ${hy - 4} Z`}
          fill={c.hair}
        />
        <rect x={-R - 3} y={hy - R * 0.62} width={R * 2 + 6} height={20} rx={10} fill="#FFD23F" />
      </g>
    ) : who === 'mia' ? (
      <g>
        <path
          d={`M ${-R - 6} ${hy + 10} Q ${-R - 8} ${hy - R - 16} 0 ${hy - R - 14} Q ${R + 8} ${hy - R - 16} ${R + 6} ${hy + 10} Q ${R * 0.75} ${hy - R * 0.35} ${R * 0.15} ${hy - R * 0.55} Q ${-R * 0.3} ${hy - R * 0.2} ${-R * 0.75} ${hy - R * 0.4} Q ${-R - 2} ${hy - R * 0.1} ${-R - 6} ${hy + 10} Z`}
          fill={c.hair}
        />
        <circle cx={R * 0.62} cy={hy - R * 0.86} r={13} fill="#FF4D8A" />
      </g>
    ) : (
      <path
        d={`M ${-R - 4} ${hy + 2} L ${-R - 10} ${hy - R * 0.7} L ${-R * 0.6} ${hy - R - 18} L ${-R * 0.3} ${hy - R - 4} L 0 ${hy - R - 26} L ${R * 0.25} ${hy - R - 6} L ${R * 0.65} ${hy - R - 20} L ${R + 8} ${hy - R * 0.6} L ${R + 4} ${hy + 2} Q ${R * 0.6} ${hy - R * 0.45} ${R * 0.1} ${hy - R * 0.35} L ${-R * 0.15} ${hy - R * 0.55} L ${-R * 0.45} ${hy - R * 0.32} Q ${-R * 0.8} ${hy - R * 0.4} ${-R - 4} ${hy + 2} Z`}
        fill={c.hair}
      />
    );

  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s}) rotate(${tilt})`}>
      {/* legs */}
      {[-1, 1].map((k) => (
        <g key={k}>
          <Limb a={v(k * d.hipW * 0.6, d.hipY)} b={v(k * d.hipW * 0.72, -18)} w={d.legW} c={c.skin} />
          <ellipse cx={k * d.hipW * 0.78} cy={-10} rx={34} ry={16} fill={c.shoe} />
        </g>
      ))}
      <path
        d={`M ${-d.hipW - 14} ${d.hipY - 26} L ${d.hipW + 14} ${d.hipY - 26} L ${d.hipW + 20} -150 L 6 -150 L 0 ${d.hipY + 20} L -6 -150 L ${-d.hipW - 20} -150 Z`}
        fill={c.shorts}
      />
      {/* torso */}
      <rect x={-18} y={d.shY - 44} width={36} height={50} fill={c.shade} />
      <path d={torso} fill={c.top} />
      {who === 'coach' ? (
        <g>
          <path d={`M -54 ${d.shY + 70} Q -28 ${d.shY + 92} -4 ${d.shY + 70}`} stroke={c.topDark} strokeWidth={5} fill="none" strokeLinecap="round" />
          <path d={`M 54 ${d.shY + 70} Q 28 ${d.shY + 92} 4 ${d.shY + 70}`} stroke={c.topDark} strokeWidth={5} fill="none" strokeLinecap="round" />
          <path d={`M -16 ${d.shY - 6} L 0 ${d.shY + 60} L 16 ${d.shY - 6}`} stroke="#F2F2F2" strokeWidth={3} fill="none" />
          <rect x={-10} y={d.shY + 58} width={20} height={26} rx={6} fill="#C9CCD6" />
        </g>
      ) : (
        <path d={`M -22 ${d.shY - 8} Q 0 ${d.shY + 18} 22 ${d.shY - 8}`} fill={c.shade} />
      )}
      {/* head */}
      {who === 'mia' ? (
        <path
          d={`M ${R * 0.7} ${hy - R * 0.75} Q ${R * 1.9} ${hy - R * 0.6} ${R * 1.45} ${hy + R * 0.9} Q ${R * 1.2} ${hy + R * 0.3} ${R * 0.85} ${hy - R * 0.1} Z`}
          fill={c.hair}
        />
      ) : null}
      <circle cx={-R} cy={hy + 4} r={13} fill={c.shade} />
      <circle cx={R} cy={hy + 4} r={13} fill={c.shade} />
      <circle cx={0} cy={hy} r={R} fill={c.skin} />
      {hair}
      {who !== 'coach' ? (
        <g opacity={0.45}>
          <circle cx={-R * 0.58} cy={hy + R * 0.3} r={11} fill="#FF7A9A" />
          <circle cx={R * 0.58} cy={hy + R * 0.3} r={11} fill="#FF7A9A" />
        </g>
      ) : null}
      <ellipse cx={-R * 0.36} cy={hy + 2} rx={7.5} ry={eyeRy} fill="#1A1A1A" />
      <ellipse cx={R * 0.36} cy={hy + 2} rx={7.5} ry={eyeRy} fill="#1A1A1A" />
      {!blink ? (
        <g>
          <circle cx={-R * 0.36 + 2.5} cy={hy - 2} r={2.6} fill="#FFFFFF" />
          <circle cx={R * 0.36 + 2.5} cy={hy - 2} r={2.6} fill="#FFFFFF" />
        </g>
      ) : null}
      {brow.map((b, i) => (
        <path key={i} d={b} stroke={c.hair} strokeWidth={7} fill="none" strokeLinecap="round" />
      ))}
      {mouthEl}
      {/* arms */}
      {[L, Rr].map((arm, i) => {
        const sh = i === 0 ? shL : shR;
        return (
          <g key={i}>
            <Limb a={sh} b={arm.elbow} w={d.armW} c={c.skin} />
            {who !== 'coach' ? <Limb a={sh} b={lerpV(sh, arm.elbow, 0.42)} w={d.armW + 12} c={c.top} /> : null}
            <Limb a={arm.elbow} b={arm.hand} w={d.foreW} c={c.skin} />
            <circle cx={arm.hand.x} cy={arm.hand.y} r={d.foreW * 0.72} fill={c.skin} />
          </g>
        );
      })}
    </g>
  );
};

export const SHOULDER = {
  coach: {L: v(-78, -424), R: v(78, -424)},
  ti: {L: v(-54, -409), R: v(54, -409)},
};
