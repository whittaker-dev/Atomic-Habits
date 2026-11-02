import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ExerciseLayout} from '../components/ExerciseLayout';
import {FrontChar, SHOULDER} from '../rig/FrontChar';
import {polar} from '../rig/math';

export const Warmup: React.FC = () => {
  const frame = useCurrentFrame();
  const phi = -Math.PI / 2 + Math.max(0, frame - 20) * 0.2;
  const sh = SHOULDER.ti;
  const handR = polar({x: sh.R.x + 70, y: sh.R.y}, phi, 105);
  const handL = polar({x: sh.L.x - 70, y: sh.L.y}, Math.PI - phi, 105);
  const circles = Math.floor(Math.max(0, frame - 20) * 0.2 / (2 * Math.PI));
  return (
    <ExerciseLayout
      step={0}
      badge="KHỞI ĐỘNG"
      title="Làm nóng vai"
      en="Warm-up · 5–10 phút"
      stats={[
        {v: '20', l: 'vòng xoay vai'},
        {v: '2×10', l: 'hít đất nhẹ'},
        {v: '1–2', l: 'hiệp tạ nhẹ'},
      ]}
      cues={['Khớp vai ấm thì ít chấn thương', 'Hiệp đầu luôn dùng tạ nhẹ']}
      reps={frame > 20 ? circles : null}
    >
      <ellipse cx={460} cy={604} rx={110} ry={16} fill="rgba(0,0,0,0.3)" />
      <FrontChar who="ti" x={460} y={600} s={0.92} handL={handL} handR={handR} mood="happy" blink={frame % 70 > 66} />
    </ExerciseLayout>
  );
};
