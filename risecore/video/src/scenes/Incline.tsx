import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ExerciseLayout} from '../components/ExerciseLayout';
import {FONT} from '../fonts';
import {InclineBench} from '../rig/equipment';
import {COACH} from '../rig/looks';
import {rep} from '../rig/math';
import {inclinePose} from '../rig/poses';
import {DumbbellSide, SideLifter} from '../rig/SideLifter';

export const INCLINE_REP = {start: 30, period: 50};

export const Incline: React.FC = () => {
  const frame = useCurrentFrame();
  const r = rep(frame, INCLINE_REP.start, INCLINE_REP.period, 0.55);
  const pose = inclinePose(r.v);
  return (
    <ExerciseLayout
      step={2}
      badge="BÀI 2/4"
      title="Đẩy ghế dốc"
      en="Incline Dumbbell Press"
      stats={[
        {v: '3', l: 'hiệp'},
        {v: '8–12', l: 'rep / hiệp'},
        {v: '90s', l: 'nghỉ'},
      ]}
      cues={['Ghế dốc khoảng 30°', 'Khuỷu tay ~45° so với thân']}
      reps={r.count}
    >
      <InclineBench />
      <path d="M 404 514 A 90 90 0 0 1 416 469" stroke="#FFD23F" strokeWidth={5} fill="none" />
      <text x={330} y={512} fill="#FFD23F" fontFamily={FONT} fontWeight={900} fontSize={40}>
        30°
      </text>
      <SideLifter
        look={COACH}
        pose={pose}
        prop={<DumbbellSide at={pose.hand} />}
        farProp={<DumbbellSide at={{x: pose.hand.x - 7, y: pose.hand.y - 9}} />}
      />
    </ExerciseLayout>
  );
};
