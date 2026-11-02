import React from 'react';
import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {FONT} from '../fonts';
import {clamp} from '../theme';

/** Comic speech bubble. Tail points to (tailX) at the bottom edge. */
export const Bubble: React.FC<{
  x: number;
  y: number;
  w: number;
  from: number;
  to?: number;
  tailX: number;
  color?: string;
  ink?: string;
  size?: number;
  children: React.ReactNode;
}> = ({x, y, w, from, to = 99999, tailX, color = '#FFFFFF', ink = '#0E1220', size = 50, children}) => {
  const frame = useCurrentFrame();
  const inn = interpolate(frame, [from, from + 10], [0, 1], {...clamp, easing: Easing.bezier(0.34, 1.56, 0.64, 1)});
  const out = interpolate(frame, [to, to + 8], [1, 0], clamp);
  const k = Math.min(inn, out);
  if (k <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        scale: `${k}`,
        opacity: Math.min(1, k * 1.5),
        transformOrigin: `${tailX}px 100%`,
      }}
    >
      <div
        style={{
          background: color,
          color: ink,
          borderRadius: 40,
          padding: '28px 36px',
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: size,
          lineHeight: 1.25,
          textAlign: 'center',
          boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
        }}
      >
        {children}
      </div>
      <svg width={60} height={44} style={{position: 'absolute', left: tailX - 30, bottom: -40}} viewBox="0 0 60 44">
        <path d="M0 0 L60 0 L22 44 Z" fill={color} />
      </svg>
    </div>
  );
};
