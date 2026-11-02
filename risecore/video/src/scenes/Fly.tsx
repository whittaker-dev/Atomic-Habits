import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ExerciseLayout} from '../components/ExerciseLayout';
import {CableTowers} from '../rig/equipment';
import {FrontChar} from '../rig/FrontChar';
import {lerpV, rep, v} from '../rig/math';

export const FLY_REP = {start: 30, period: 60};

export const Fly: React.FC = () => {
  const frame = useCurrentFrame();
  const r = rep(frame, FLY_REP.start, FLY_REP.period, 0.45);
  const s = 0.92;
  const X = 460;
  const Y = 600;
  const hR = lerpV(v(250, -395), v(36, -372), r.v);
  const hL = v(-hR.x, hR.y);
  const abs = (p: {x: number; y: number}) => v(X + p.x * s, Y + p.y * s);
  const aR = abs(hR);
  const aL = abs(hL);
  return (
    <ExerciseLayout
      step={4}
      badge="BÀI 4/4"
      title="Ép ngực cáp"
      en="Cable Fly"
      stats={[
        {v: '3', l: 'hiệp'},
        {v: '12–15', l: 'rep / hiệp'},
        {v: '60s', l: 'nghỉ'},
      ]}
      cues={['Khuỷu hơi cong, giữ cố định', 'Ép chậm, siết 1 giây']}
      reps={r.count}
    >
      <CableTowers />
      <line x1={40} y1={250} x2={aL.x} y2={aL.y} stroke="#C9CCD6" strokeWidth={4} />
      <line x1={880} y1={250} x2={aR.x} y2={aR.y} stroke="#C9CCD6" strokeWidth={4} />
      <ellipse cx={X} cy={604} rx={120} ry={16} fill="rgba(0,0,0,0.3)" />
      <FrontChar who="coach" x={X} y={Y} s={s} handL={hL} handR={hR} mood={r.v > 0.8 ? 'proud' : 'happy'} blink={frame % 80 > 76} />
      <rect x={aL.x - 10} y={aL.y - 22} width={20} height={44} rx={8} fill="#FFD23F" />
      <rect x={aR.x - 10} y={aR.y - 22} width={20} height={44} rx={8} fill="#FFD23F" />
    </ExerciseLayout>
  );
};
