import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ExerciseLayout} from '../components/ExerciseLayout';
import {Mat} from '../rig/equipment';
import {TI} from '../rig/looks';
import {norm, rep, sub, v} from '../rig/math';
import {pushupPose} from '../rig/poses';
import {SideLifter} from '../rig/SideLifter';

export const PUSHUP_REP = {start: 30, period: 46};

export const Pushup: React.FC = () => {
  const frame = useCurrentFrame();
  const r = rep(frame, PUSHUP_REP.start, PUSHUP_REP.period, 0.5);
  const pose = pushupPose(r.v);
  const lineOn = frame > 60 && frame < 200;
  const u = norm(sub(pose.shoulder, pose.foot));
  const n = v(-u.y, u.x);
  return (
    <ExerciseLayout
      step={3}
      badge="BÀI 3/4"
      title="Hít đất"
      en="Push-up · bài “vắt” cuối"
      stats={[
        {v: '3', l: 'hiệp'},
        {v: 'Gần max', l: 'rep / hiệp'},
        {v: '60s', l: 'nghỉ'},
      ]}
      cues={['Người thẳng như tấm ván', 'Còn 1–2 rep thì dừng']}
      reps={r.count}
    >
      <Mat />
      <SideLifter look={TI} pose={pose} farOffset={{x: -4, y: -6}} />
      {lineOn ? (
        <line
          x1={pose.foot.x + n.x * 50}
          y1={pose.foot.y + n.y * 50}
          x2={pose.shoulder.x + n.x * 50}
          y2={pose.shoulder.y + n.y * 50}
          stroke="#2EE6A6"
          strokeWidth={6}
          strokeDasharray="14 12"
          strokeLinecap="round"
        />
      ) : null}
    </ExerciseLayout>
  );
};
