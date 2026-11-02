import React from 'react';
import {Look} from './looks';
import {V, add, lerpV, mul, norm, sub, v, polar} from './math';

const Limb: React.FC<{a: V; b: V; w: number; c: string}> = ({a, b, w, c}) => (
  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={c} strokeWidth={w} strokeLinecap="round" />
);

export type SidePose = {
  hip: V;
  shoulder: V;
  knee: V;
  foot: V;
  elbow: V;
  hand: V;
  /** +1: face toward the "up" side of the body axis, -1: the other side */
  face: 1 | -1;
  shoeAng?: number;
};

export const SideLifter: React.FC<{
  look: Look;
  pose: SidePose;
  far?: Partial<SidePose>;
  farOffset?: V;
  prop?: React.ReactNode;
  farProp?: React.ReactNode;
}> = ({look: L, pose: P, far, farOffset = v(-7, -9), prop, farProp}) => {
  const o = (p: V) => add(p, farOffset);
  const F = {
    knee: far?.knee ?? o(P.knee),
    foot: far?.foot ?? o(P.foot),
    elbow: far?.elbow ?? o(P.elbow),
    hand: far?.hand ?? o(P.hand),
  };
  const u = norm(sub(P.shoulder, P.hip));
  const n = mul(v(-u.y, u.x), P.face);
  const head = add(P.shoulder, mul(u, L.headR + 20));
  const shoeAng = P.shoeAng ?? 0;
  const shoe = (f: V, c: string) => <Limb a={f} b={polar(f, shoeAng, 28)} w={24} c={c} />;
  const sleeve = L.name === 'ti';

  return (
    <g>
      {/* far side */}
      <Limb a={o(P.hip)} b={F.knee} w={L.legW} c={L.skinShade} />
      <Limb a={F.knee} b={F.foot} w={L.legW - 6} c={L.skinShade} />
      {shoe(F.foot, '#9A9A9A')}
      <Limb a={o(P.shoulder)} b={F.elbow} w={L.armW} c={L.skinShade} />
      <Limb a={F.elbow} b={F.hand} w={L.foreW} c={L.skinShade} />
      {farProp}

      {/* near leg */}
      <Limb a={P.hip} b={P.knee} w={L.legW} c={L.skin} />
      <Limb a={P.knee} b={P.foot} w={L.legW - 6} c={L.skin} />
      {shoe(P.foot, L.shoe)}
      <Limb a={P.hip} b={lerpV(P.hip, P.knee, 0.62)} w={L.legW + 12} c={L.shorts} />

      {/* torso + head */}
      <Limb a={P.shoulder} b={head} w={22} c={L.skin} />
      <Limb a={P.hip} b={P.shoulder} w={L.torsoW} c={L.top} />
      <circle cx={head.x - n.x * 5 + u.x * 4} cy={head.y - n.y * 5 + u.y * 4} r={L.headR + 3} fill={L.hair} />
      <circle cx={head.x + n.x * 2} cy={head.y + n.y * 2} r={L.headR} fill={L.skin} />
      {L.band ? (
        <Limb
          a={add(head, add(mul(u, L.headR * 0.35), mul(n, -L.headR * 0.92)))}
          b={add(head, add(mul(u, L.headR * 0.35), mul(n, L.headR * 0.92)))}
          w={11}
          c={L.band}
        />
      ) : null}
      <circle
        cx={head.x + n.x * L.headR * 0.5 - u.x * L.headR * 0.05}
        cy={head.y + n.y * L.headR * 0.5 - u.y * L.headR * 0.05}
        r={5}
        fill="#1A1A1A"
      />

      {prop}

      {/* near arm */}
      <Limb a={P.shoulder} b={P.elbow} w={L.armW} c={L.skin} />
      {sleeve ? <Limb a={P.shoulder} b={lerpV(P.shoulder, P.elbow, 0.4)} w={L.armW + 10} c={L.top} /> : null}
      <Limb a={P.elbow} b={P.hand} w={L.foreW} c={L.skin} />
      <circle cx={P.hand.x} cy={P.hand.y} r={L.foreW * 0.68} fill={L.skin} />
    </g>
  );
};

export const PlateSide: React.FC<{at: V; r?: number; color?: string}> = ({at, r = 58, color = '#2B2F3A'}) => (
  <g>
    <line x1={at.x} y1={at.y} x2={at.x} y2={at.y} stroke="#C9CCD6" strokeWidth={18} strokeLinecap="round" />
    <circle cx={at.x} cy={at.y} r={r} fill={color} stroke="#FF4D4D" strokeWidth={8} />
    <circle cx={at.x} cy={at.y} r={r * 0.32} fill="#C9CCD6" />
  </g>
);

export const DumbbellSide: React.FC<{at: V}> = ({at}) => (
  <g>
    <circle cx={at.x} cy={at.y} r={30} fill="#2B2F3A" stroke="#FFD23F" strokeWidth={6} />
    <circle cx={at.x} cy={at.y} r={9} fill="#C9CCD6" />
  </g>
);
