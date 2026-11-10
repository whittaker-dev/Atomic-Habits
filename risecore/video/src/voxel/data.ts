import {Line, Manifest, Timeline, TimedLine, TimedScene, buildTimeline} from '../english/timeline';

/** `shot`: cận mặt người nói hay toàn cảnh 2 người. `mood` đổi mắt/lông mày/tay của cả hai nhân vật trong câu đó. */
export type VoxelLine = Line & {shot: 'close' | 'wide'; mood?: 'serious' | 'happy'};
export type CardKind = 'wrong' | 'rule' | 'phrase' | 'practice' | 'quiz' | 'cta';
/**
 * `chip` là nhãn trên cùng, phần trong *…* tô vàng. `keywords` là các từ tô vàng trong phụ đề.
 * Thẻ `quiz` có `options` (A, B…) và `answer` (vị trí đáp án đúng); cảnh quiz gồm câu hỏi rồi câu trả lời có
 * `pauseBefore` — khoảng nghỉ đó là lúc đếm ngược.
 */
export type VoxelScene = {
  chip: string;
  step?: number;
  card: {kind: CardKind; text: string; sub: string; options?: string[]; answer?: number};
  keywords: string[];
  lines: VoxelLine[];
};
/** `cover`: chữ trên ảnh bìa — `kicker` (nhãn đỏ), `title` (to, vàng), `sub` */
export type VoxelReelData = {id: string; series: string; number: number; cover: {kicker: string; title: string; sub: string}; scenes: VoxelScene[]};

export type VoxelTimedLine = TimedLine & {shot: 'close' | 'wide'; mood?: 'serious' | 'happy'};
export type VoxelTimeline = Timeline<VoxelScene> & {lines: VoxelTimedLine[]};

export function buildVoxelTimeline(reel: VoxelReelData, manifest: Manifest, fps: number): VoxelTimeline {
  const t = buildTimeline(reel, manifest, fps);
  // buildTimeline giữ nguyên các trường thêm của từng câu (shot, mood), chỉ có kiểu là không biết
  const lines = t.scenes.flatMap((s) => s.lines) as VoxelTimedLine[];
  return {...t, lines};
}

export type TimedVoxelScene = TimedScene<VoxelScene>;

/** Câu đang diễn ra (tính cả khoảng nghỉ sau câu, cho tới khi câu sau bắt đầu) và câu trước đó */
export function lineAt(timeline: VoxelTimeline, frame: number): {line: VoxelTimedLine | null; prev: VoxelTimedLine | null; index: number} {
  let index = -1;
  for (let i = 0; i < timeline.lines.length; i++) if (timeline.lines[i].from <= frame) index = i;
  return {line: index >= 0 ? timeline.lines[index] : null, prev: index > 0 ? timeline.lines[index - 1] : null, index};
}

/**
 * Độ mở miệng 0..1 lấy từ mốc thời gian từng từ của ElevenLabs: trong lúc đọc một từ thì miệng
 * đóng mở theo nhịp âm tiết, giữa các từ thì khép lại.
 */
export function mouthOpen(line: TimedLine, frame: number, fps: number): number {
  const t = (frame - line.from) / fps;
  const words = line.words ?? [{w: line.say, start: 0, end: line.dur / fps}];
  const w = words.find((x) => t >= x.start - 0.02 && t <= x.end + 0.04);
  if (!w) return 0;
  const len = Math.max(0.08, w.end - w.start);
  const env = Math.sin(Math.PI * Math.min(1, Math.max(0, (t - w.start + 0.02) / (len + 0.06))));
  const syll = 0.45 + 0.55 * Math.abs(Math.sin((t - w.start) * Math.PI * 5.5));
  return Math.max(0, Math.min(1, env * syll));
}

/** Bỏ dấu câu, chữ thường — để so từ trong phụ đề với danh sách từ khoá / chữ trên thẻ */
export const plain = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, '');

/** Số ngẫu nhiên có seed (mulberry32) — render lại ra y hệt */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
