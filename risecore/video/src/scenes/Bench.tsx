import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ExerciseLayout} from '../components/ExerciseLayout';
import {FlatBench} from '../rig/equipment';
import {COACH} from '../rig/looks';
import {rep} from '../rig/math';
import {benchPose} from '../rig/poses';
import {PlateSide, SideLifter} from '../rig/SideLifter';

export const BENCH_REP = {start: 30, period: 54};

export const Bench: React.FC = () => {
  const frame = useCurrentFrame();
  const r = rep(frame, BENCH_REP.start, BENCH_REP.period, 0.55);
  const pose = benchPose(COACH, r.v);
  return (
    <ExerciseLayout
      step={1}
      badge="BÀI 1/4"
      title="Đẩy ngực ngang"
      en="Barbell Bench Press"
      stats={[
        {v: '4', l: 'hiệp'},
        {v: '6–10', l: 'rep / hiệp'},
        {v: '2 phút', l: 'nghỉ'},
      ]}
      cues={['Siết bả vai, chân bám sàn', 'Hạ tạ chạm giữa ngực']}
      reps={r.count}
    >
      <FlatBench />
      <SideLifter look={COACH} pose={pose} prop={<PlateSide at={pose.hand} />} />
    </ExerciseLayout>
  );
};
