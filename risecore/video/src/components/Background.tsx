import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';

export const Background: React.FC<{a?: string; b?: string}> = ({a = '#FF4D4D', b = '#3DA5FF'}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{backgroundColor: '#0E1220', overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          width: 1100,
          height: 1100,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${a}4D 0%, ${a}00 65%)`,
          left: -450 + Math.sin(frame / 50) * 60,
          top: -420 + Math.cos(frame / 60) * 50,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 1300,
          height: 1300,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${b}47 0%, ${b}00 65%)`,
          left: 200 + Math.cos(frame / 70) * 70,
          top: 1050 + Math.sin(frame / 55) * 60,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 18px, transparent 18px, transparent 44px)',
        }}
      />
    </AbsoluteFill>
  );
};
