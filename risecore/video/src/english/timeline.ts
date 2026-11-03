export type Speaker = 'ti' | 'mia';
/** `say` là câu tiếng Anh được đọc, `vi` là phụ đề tiếng Việt hiện bên dưới */
export type Line = {speaker: Speaker; say: string; vi?: string; pauseBefore?: number};

type Base = {lines: Line[]};
export type Scene =
  | (Base & {type: 'hook'; title: string; subtitle: string})
  | (Base & {type: 'phrase'; en: string; vi: string; note: string})
  | (Base & {type: 'quiz'; question: string; options: string[]; answer: number})
  | (Base & {type: 'cta'; title: string; subtitle: string});

export type Lesson = {id: string; series: string; number: number; level: string; scenes: Scene[]};
export type Manifest = {id: string; provider: string; lines: {file: string; duration: number; speaker: Speaker; say: string}[]};

export type TimedLine = Line & {file: string; from: number; dur: number};
export type TimedScene = {scene: Scene; from: number; dur: number; lines: TimedLine[]};
export type Timeline = {scenes: TimedScene[]; total: number};

const LEAD = 10; // khung hình trống trước câu đầu tiên
const GAP = 8; // nghỉ giữa 2 câu
const TAIL = 14; // giữ cảnh thêm một chút sau câu cuối
const END = 30;

/** Mọi mốc thời gian lấy từ độ dài file giọng đọc, nên đổi giọng hay sửa câu thì video tự dài/ngắn theo. */
export function buildTimeline(lesson: Lesson, manifest: Manifest, fps: number): Timeline {
  const all = lesson.scenes.flatMap((s) => s.lines);
  if (manifest.lines.length !== all.length || all.some((l, i) => manifest.lines[i].say !== l.say)) {
    throw new Error(`Giọng đọc của ${lesson.id} đã cũ, chạy lại: node scripts/make-voice.mjs ${lesson.id}`);
  }
  let cursor = LEAD;
  let k = 0;
  const scenes = lesson.scenes.map((scene) => {
    const from = cursor;
    const lines = scene.lines.map((line) => {
      const m = manifest.lines[k++];
      cursor += Math.round((line.pauseBefore ?? 0) * fps);
      const timed = {...line, file: m.file, from: cursor, dur: Math.ceil(m.duration * fps)};
      cursor += timed.dur + GAP;
      return timed;
    });
    cursor += TAIL;
    return {scene, from, dur: cursor - from, lines};
  });
  return {scenes, total: cursor + END};
}
