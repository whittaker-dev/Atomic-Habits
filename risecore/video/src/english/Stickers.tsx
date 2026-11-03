import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp} from '../theme';
import type {Pose, Speaker, Timeline} from './timeline';

// Nhân vật là ảnh sticker (public/characters/<ai>/<biểu cảm>.png, cắt bằng scripts/cut-sheet.sh).
// Mọi ảnh cùng khung nên đổi biểu cảm không làm nhân vật nhảy chỗ.
// Mỗi ô có lề trống 2 bên nên 2 ảnh được phép chồng nhẹ vào nhau ở giữa
const W = 640;
const H = Math.round((W * 305) / 410); // tỉ lệ 1 ô sau khi cắt
const BOTTOM = 1410; // lấn xuống dưới khung phụ đề (y 1380) để khung che đường cắt ngang thắt lưng
const CENTER: Record<Speaker, number> = {com: 270, mia: 810};

type State = {pose: Pose; since: number; talking: boolean};

/** Biểu cảm của 1 nhân vật tại 1 khung hình: giữ biểu cảm của câu gần nhất cho tới câu sau. */
function stateAt(timeline: Timeline, frame: number, who: Speaker, fps: number): State {
  const lines = timeline.scenes.flatMap((s) => s.lines);
  // Lúc đếm ngược trước khi ra đáp án thì cả 2 cùng suy nghĩ
  const pause = lines.find((l) => l.pauseBefore && frame >= l.from - l.pauseBefore * fps && frame < l.from);
  if (pause) return {pose: 'think', since: pause.from - (pause.pauseBefore ?? 0) * fps, talking: false};
  const last = [...lines].reverse().find((l) => l.from <= frame);
  // Trước câu đầu tiên: dùng luôn biểu cảm của câu đầu cho cả 2
  const first = lines[0];
  if (!last) return {pose: first.speaker === who ? (first.pose ?? 'talk') : (first.listen ?? 'thumbs'), since: 0, talking: false};
  const talking = last.speaker === who && frame < last.from + last.dur;
  const pose = last.speaker === who ? (last.pose ?? 'talk') : (last.listen ?? 'thumbs');
  return {pose, since: last.from, talking};
}

const Sticker: React.FC<{who: Speaker; timeline: Timeline}> = ({who, timeline}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {pose, since, talking} = stateAt(timeline, frame, who, fps);
  const side = who === 'com' ? -1 : 1;
  return (
    <Img
      src={staticFile(`characters/${who}/${pose}.png`)}
      style={{
        position: 'absolute',
        width: W,
        height: H,
        left: CENTER[who] - W / 2,
        top: BOTTOM - H,
        transformOrigin: '50% 100%',
        // vào cảnh từ 2 bên, nảy nhẹ mỗi lần đổi biểu cảm, nhún khi đang nói
        translate: `${interpolate(frame, [0, 16], [side * 600, 0], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)})}px ${talking ? -10 * Math.abs(Math.sin(frame * 0.45)) : 0}px`,
        scale: `${interpolate(frame, [since, since + 8], [0.9, 1], {...clamp, easing: Easing.bezier(0.34, 1.56, 0.64, 1)}) * (1 + 0.012 * Math.sin(frame / 12))}`,
        rotate: `${talking ? 1.5 * Math.sin(frame * 0.2) : 0}deg`,
      }}
    />
  );
};

export const Stickers: React.FC<{timeline: Timeline}> = ({timeline}) => (
  <AbsoluteFill>
    <Sticker who="com" timeline={timeline} />
    <Sticker who="mia" timeline={timeline} />
  </AbsoluteFill>
);
