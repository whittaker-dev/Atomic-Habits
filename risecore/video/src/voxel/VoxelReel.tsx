import React from 'react';
import {AbsoluteFill, CalculateMetadataFunction, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import {ThreeCanvas} from '@remotion/three';
import '../fonts';
import {FONT} from '../fonts';
import {clamp} from '../theme';
import {Manifest} from '../english/timeline';
import {buildVoxelTimeline, lineAt, plain, rng, TimedVoxelScene, VoxelReelData, VoxelTimedLine, VoxelTimeline} from './data';
import {World} from './Voxel3D';

const YELLOW = '#FFD60A';
const RED = '#FF4D5E';
const MINT = '#2EE6A6';
const PANEL = 'rgba(12,16,42,0.9)';
// Bố cục dọc: nhãn trên cùng → thẻ (phía trên đầu nhân vật) → nhân vật → phụ đề ở khoảng giữa-dưới
const CHIP_TOP = 110;
const CARD_TOP = 270;
const CAPTION_TOP = 1430;
const VI_TOP = 1560;

export type VoxelProps = {reelId: string; reel?: VoxelReelData; timeline?: VoxelTimeline};

export const calculateVoxelMetadata: CalculateMetadataFunction<VoxelProps> = async ({props}) => {
  const get = async <T,>(p: string): Promise<T> => {
    const res = await fetch(staticFile(p));
    if (!res.ok) throw new Error(`Không đọc được ${p} — đã chạy make-voice chưa?`);
    return res.json();
  };
  const reel = await get<VoxelReelData>(`lessons/${props.reelId}.json`);
  const manifest = await get<Manifest>(`voice/${props.reelId}/manifest.json`);
  const timeline = buildVoxelTimeline(reel, manifest, 30);
  return {durationInFrames: timeline.total, props: {...props, reel, timeline}};
};

/** "LỖI SAI · *very*" → phần trong *…* tô vàng */
const Marked: React.FC<{text: string}> = ({text}) => (
  <>
    {text.split(/(\*[^*]+\*)/).map((part, i) =>
      part.startsWith('*') ? (
        <span key={i} style={{color: YELLOW}}>
          {part.slice(1, -1)}
        </span>
      ) : (
        <span key={i}>{part}</span>
      ),
    )}
  </>
);

const sceneAt = (timeline: VoxelTimeline, frame: number) => {
  let s = timeline.scenes[0];
  for (const x of timeline.scenes) if (x.from <= frame) s = x;
  return s;
};

const TopChip: React.FC<{timeline: VoxelTimeline}> = ({timeline}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = sceneAt(timeline, frame);
  const pop = spring({frame: frame - s.from, fps, config: {damping: 12, stiffness: 180}});
  // Số bước đã tới (sau bước cuối thì giữ đầy)
  const reached = Math.max(0, ...timeline.scenes.filter((x) => x.from <= frame && x.scene.step).map((x) => x.scene.step!));
  const steps = Math.max(...timeline.scenes.map((x) => x.scene.step ?? 0));
  return (
    <div style={{position: 'absolute', top: CHIP_TOP, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18}}>
      <div
        style={{
          transform: `scale(${0.85 + 0.15 * pop})`,
          opacity: pop,
          padding: '16px 36px',
          borderRadius: 999,
          background: PANEL,
          border: '2px solid rgba(255,255,255,0.14)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 42,
          color: '#FFFFFF',
          letterSpacing: 0.5,
          whiteSpace: 'nowrap',
        }}
      >
        <Marked text={s.scene.chip} />
      </div>
      <div style={{display: 'flex', gap: 12}}>
        {Array.from({length: steps}).map((_, i) => {
          const at = timeline.scenes.find((x) => x.scene.step === i + 1)?.from ?? 0;
          const fill = i < reached ? interpolate(frame - at, [0, 10], [0, 1], clamp) : 0;
          return (
            <div key={i} style={{width: 74, height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.22)', overflow: 'hidden'}}>
              <div style={{width: `${fill * 100}%`, height: '100%', background: YELLOW}} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** Khoảng khung hình đọc đúng chữ trên thẻ (vd "I really like it" trong "Step one: I really like it.") */
function spokenRange(line: VoxelTimedLine, text: string, fps: number): [number, number] | null {
  const want = text.split(/\s+/).map(plain).filter(Boolean);
  const words = line.words ?? [];
  const got = words.map((w) => plain(w.w));
  for (let i = 0; i + want.length <= got.length; i++) {
    if (want.every((w, k) => got[i + k] === w)) {
      return [line.from + Math.round(words[i].start * fps), line.from + Math.round(words[i + want.length - 1].end * fps)];
    }
  }
  return null;
}

/** Khung hình bắt đầu/kết thúc đánh chữ trên thẻ của cảnh, khớp lúc chữ đó được đọc */
export function typingRange(s: TimedVoxelScene, fps: number): [number, number] {
  const first = s.lines[0] as VoxelTimedLine;
  return spokenRange(first, s.scene.card.text, fps) ?? [s.from + 4, s.from + 18];
}

const Typed: React.FC<{text: string; range: [number, number]; size: number; color: string}> = ({text, range, size, color}) => {
  const frame = useCurrentFrame();
  const n = Math.round(interpolate(frame, range, [0, text.length], clamp));
  const caret = n < text.length && frame >= range[0] && Math.floor(frame / 8) % 2 === 0;
  return (
    <div style={{fontFamily: FONT, fontWeight: 900, fontSize: size, color, lineHeight: 1.15, whiteSpace: 'nowrap'}}>
      {text.slice(0, n)}
      <span style={{opacity: n < text.length ? 1 : 0, color: YELLOW}}>{caret ? '|' : ' '}</span>
    </div>
  );
};

const Stamp: React.FC<{at: number; children: React.ReactNode; color: string; style?: React.CSSProperties}> = ({at, children, color, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const k = spring({frame: frame - at, fps, config: {damping: 10, stiffness: 220}});
  if (frame < at) return null;
  return (
    <div
      style={{
        position: 'absolute',
        transform: `scale(${2 - k}) rotate(-12deg)`,
        opacity: Math.min(1, k * 1.5),
        fontFamily: FONT,
        fontWeight: 900,
        color,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const Card: React.FC<{s: TimedVoxelScene}> = ({s}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {kind, text, sub} = s.scene.card;
  const enter = spring({frame: frame - s.from - 2, fps, config: {damping: 14, stiffness: 160}});
  const range = typingRange(s, fps);
  const lastLine = s.lines[s.lines.length - 1];
  const lastWord = lastLine.words?.[lastLine.words.length - 1];
  const crossAt = lastWord ? lastLine.from + Math.round(lastWord.start * fps) : lastLine.from + 10;

  if (kind === 'cta') {
    return (
      <div style={{position: 'absolute', top: CARD_TOP + 10, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22}}>
        <div
          style={{
            transform: `scale(${enter}) rotate(${(1 - enter) * -8}deg)`,
            padding: '26px 70px',
            borderRadius: 36,
            background: YELLOW,
            color: '#0B0F2A',
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: 130,
            letterSpacing: 2,
            boxShadow: '0 18px 0 #C9A500, 0 30px 60px rgba(0,0,0,0.45)',
          }}
        >
          {text}
        </div>
        <div style={{opacity: enter, fontFamily: FONT, fontWeight: 800, fontSize: 46, color: '#FFFFFF', textShadow: '0 4px 14px rgba(0,0,0,0.6)'}}>{sub}</div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: CARD_TOP,
        left: 80,
        right: 80,
        height: 290,
        transform: `translateY(${(1 - enter) * -60}px) scale(${0.9 + 0.1 * enter})`,
        opacity: enter,
        borderRadius: 40,
        background: PANEL,
        border: '3px solid rgba(255,255,255,0.12)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
      }}
    >
      <div style={{position: 'relative', display: 'flex', alignItems: 'center', gap: 24}}>
        <Typed text={text} range={range} size={text.length > 16 ? 66 : 80} color={kind === 'wrong' ? '#FFFFFF' : kind === 'rule' ? '#FFFFFF' : MINT} />
        {kind === 'wrong' ? (
          <div
            style={{
              position: 'absolute',
              left: -10,
              top: '50%',
              height: 12,
              borderRadius: 6,
              background: RED,
              width: `${interpolate(frame, [range[1] + 4, range[1] + 12], [0, 104], clamp)}%`,
            }}
          />
        ) : null}
        {kind === 'phrase' ? (
          <Stamp at={range[1] + 4} color="#0B0F2A" style={{position: 'relative'}}>
            <div style={{width: 84, height: 84, borderRadius: 42, background: MINT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60}}>✓</div>
          </Stamp>
        ) : null}
      </div>
      <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 40, color: kind === 'phrase' ? '#C9D4FF' : '#FF9AA5'}}>{sub}</div>
      {kind === 'wrong' ? (
        <Stamp at={range[1] + 14} color={RED} style={{right: 40, top: -36, fontSize: 92, border: `8px solid ${RED}`, borderRadius: 20, padding: '0 22px', background: 'rgba(12,16,42,0.95)'}}>
          SAI!
        </Stamp>
      ) : null}
      {kind === 'rule' ? (
        <Stamp at={crossAt} color={RED} style={{right: 44, top: -40, fontSize: 120}}>
          ✗
        </Stamp>
      ) : null}
    </div>
  );
};

type Chunk = {words: {w: string; at: number}[]; from: number};

/** Chia câu thành cụm 2–3 từ; ngắt sớm sau dấu câu */
function chunks(line: VoxelTimedLine, fps: number): Chunk[] {
  const out: Chunk[] = [];
  let cur: Chunk | null = null;
  for (const w of line.words ?? []) {
    const at = line.from + Math.round(w.start * fps);
    cur ??= {words: [], from: at};
    cur.words.push({w: w.w, at});
    if (cur.words.length === 3 || /[.!?,:]$|\.\.\.$/.test(w.w.replace(/["”]$/, ''))) {
      out.push(cur);
      cur = null;
    }
  }
  if (cur) out.push(cur);
  return out;
}

const Captions: React.FC<{timeline: VoxelTimeline}> = ({timeline}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {line} = lineAt(timeline, frame);
  if (!line || frame > line.from + line.dur + 6) return null;
  const scene = timeline.scenes.find((s) => s.lines.some((l) => l.from === line.from))!;
  const keys = new Set(scene.scene.keywords.map(plain));
  const list = chunks(line, fps);
  const chunk = [...list].reverse().find((c) => c.from <= frame) ?? list[0];
  if (!chunk) return null;
  return (
    <div style={{position: 'absolute', top: CAPTION_TOP, left: 40, right: 40, display: 'flex', justifyContent: 'center', gap: 22, flexWrap: 'wrap'}}>
      {chunk.words.map((w, i) => {
        const k = spring({frame: frame - w.at, fps, config: {damping: 11, stiffness: 260}});
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              transform: `scale(${0.6 + 0.4 * k}) translateY(${(1 - k) * 18}px)`,
              opacity: frame >= w.at ? 1 : 0,
              fontFamily: FONT,
              fontWeight: 900,
              fontSize: 84,
              color: keys.has(plain(w.w)) ? YELLOW : '#FFFFFF',
              WebkitTextStroke: '10px #0B0F2A',
              paintOrder: 'stroke fill',
              textShadow: '0 8px 0 rgba(0,0,0,0.35)',
            }}
          >
            {w.w}
          </span>
        );
      })}
    </div>
  );
};

const Vietnamese: React.FC<{timeline: VoxelTimeline}> = ({timeline}) => {
  const frame = useCurrentFrame();
  const {line} = lineAt(timeline, frame);
  if (!line?.vi || frame > line.from + line.dur + 6) return null;
  return (
    <div style={{position: 'absolute', top: VI_TOP, left: 60, right: 60, display: 'flex', justifyContent: 'center'}}>
      <div
        style={{
          opacity: interpolate(frame, [line.from, line.from + 5], [0, 1], clamp),
          padding: '10px 28px',
          borderRadius: 22,
          background: 'rgba(8,10,30,0.72)',
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 42,
          color: '#D5DCFF',
          textAlign: 'center',
        }}
      >
        {line.vi}
      </div>
    </div>
  );
};

/** Pháo giấy rơi ở cảnh kêu gọi bình luận */
const Confetti: React.FC<{from: number}> = ({from}) => {
  const frame = useCurrentFrame();
  const {height} = useVideoConfig();
  const t = frame - from;
  if (t < 0) return null;
  const r = rng(42);
  const colors = [YELLOW, '#FF5CA8', '#3DD6FF', MINT, '#9B7BFF', '#FFFFFF'];
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {Array.from({length: 110}, (_, i) => {
        const x = r() * 1080;
        const delay = r() * 18;
        const speed = 14 + r() * 12;
        const sway = 30 + r() * 50;
        const spin = (r() - 0.5) * 30;
        const w = 14 + r() * 16;
        const c = colors[Math.floor(r() * colors.length)];
        const tt = Math.max(0, t - delay);
        const y = -60 + tt * speed;
        if (y > height + 40 || t < delay) return null;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x + Math.sin(tt / 9 + i) * sway,
              top: y,
              width: w,
              height: w * 0.55,
              background: c,
              borderRadius: 3,
              transform: `rotate(${tt * spin}deg)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

export const VoxelReel: React.FC<VoxelProps> = ({timeline}) => {
  const frame = useCurrentFrame();
  const {width, height, fps, durationInFrames} = useVideoConfig();
  if (!timeline) throw new Error('Thiếu timeline — calculateVoxelMetadata chưa chạy');
  const lines = timeline.lines;
  const cta = timeline.scenes.find((s) => s.scene.card.kind === 'cta');
  const speaking = (f: number) => lines.some((l) => f >= l.from && f < l.from + l.dur);

  return (
    <AbsoluteFill style={{background: '#0A0F2C'}}>
      <ThreeCanvas width={width} height={height} shadows="percentage" camera={{fov: 40, near: 0.1, far: 100}}>
        <World timeline={timeline} frame={frame} fps={fps} />
      </ThreeCanvas>
      {/* Tối nhẹ phía trên để nhãn và thẻ dễ đọc */}
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(5,8,25,0.55) 0%, rgba(5,8,25,0) 34%, rgba(5,8,25,0) 70%, rgba(5,8,25,0.45) 100%)'}} />
      <TopChip timeline={timeline} />
      {timeline.scenes.map((s, i) => (
        <Sequence key={s.from} name={`Card ${s.scene.card.kind}`} from={s.from} durationInFrames={(timeline.scenes[i + 1]?.from ?? timeline.total) - s.from} layout="none">
          <Card s={{...s, from: 0, lines: s.lines.map((l) => ({...l, from: l.from - s.from}))}} />
        </Sequence>
      ))}
      {cta ? <Confetti from={cta.lines[0].from} /> : null}
      <Captions timeline={timeline} />
      <Vietnamese timeline={timeline} />

      {lines.map((l) => (
        <Sequence key={l.file} name={`Voice ${l.speaker}`} from={l.from} durationInFrames={l.dur}>
          <Audio src={staticFile(l.file)} />
        </Sequence>
      ))}
      <Audio
        name="Music"
        src={staticFile('audio/music.wav')}
        // Nhạc nền nhỏ xuống khi có người nói
        volume={(f) => interpolate(f, [0, 15, durationInFrames - 45, durationInFrames], [0, 1, 1, 0], clamp) * (speaking(f) ? 0.07 : 0.13)}
      />
      {lines.slice(1).map((l) => (
        <Sequence key={`w${l.from}`} name="Cut whoosh" from={l.from - 4} durationInFrames={20}>
          <Audio src={staticFile('audio/whoosh.wav')} volume={0.22} />
        </Sequence>
      ))}
      {timeline.scenes.map((s) => (
        <Sequence key={`p${s.from}`} name="Card pop" from={s.from + 2} durationInFrames={10}>
          <Audio src={staticFile('audio/pop.wav')} volume={0.4} />
        </Sequence>
      ))}
      {timeline.scenes
        .filter((s) => s.scene.card.kind === 'wrong' || s.scene.card.kind === 'phrase')
        .flatMap((s) => {
          const [a, b] = typingRange(s, fps);
          const ticks = Array.from({length: Math.max(1, Math.floor((b - a) / 2))}, (_, i) => a + i * 2);
          const hit = s.scene.card.kind === 'wrong' ? b + 14 : b + 4;
          return [
            ...ticks.map((t) => (
              <Sequence key={`t${t}`} name="Typing" from={t} durationInFrames={4}>
                <Audio src={staticFile('audio/tick.wav')} volume={0.12} />
              </Sequence>
            )),
            <Sequence key={`h${hit}`} name={s.scene.card.kind === 'wrong' ? 'Stamp' : 'Check'} from={hit} durationInFrames={20}>
              <Audio src={staticFile(s.scene.card.kind === 'wrong' ? 'audio/stamp.wav' : 'audio/pop.wav')} volume={0.5} />
            </Sequence>,
          ];
        })}
      {cta ? (
        <Sequence name="Chime" from={cta.lines[0].from} durationInFrames={40}>
          <Audio src={staticFile('audio/ding.wav')} volume={0.5} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};

/**
 * Ảnh bìa: 2 nhân vật nhìn thẳng (khung cuối, đang giơ tay vui) + tiêu đề lớn.
 * Facebook cắt ảnh xem trước trong lưới còn khoảng y 420–1500, nên tiêu đề và nhân vật đều nằm trong dải đó.
 */
export const VoxelCover: React.FC<VoxelProps> = ({reel, timeline}) => {
  const {width, height, fps} = useVideoConfig();
  if (!reel || !timeline) throw new Error('Thiếu dữ liệu — calculateVoxelMetadata chưa chạy');
  const last = timeline.lines[timeline.lines.length - 1];
  return (
    <AbsoluteFill style={{background: '#0A0F2C'}}>
      <ThreeCanvas width={width} height={height} shadows="percentage" camera={{fov: 40, near: 0.1, far: 100}}>
        <World timeline={timeline} frame={last.from + 14} fps={fps} shot={{pos: [0, 2.6, 11.8], target: [0, 2.34, 0]}} />
      </ThreeCanvas>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(5,8,25,0.7) 0%, rgba(5,8,25,0.2) 42%, rgba(5,8,25,0) 60%)'}} />
      <div style={{position: 'absolute', top: 440, left: 40, right: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, fontFamily: FONT, fontWeight: 900}}>
        <div style={{padding: '8px 30px', borderRadius: 18, background: RED, color: '#FFFFFF', fontSize: 58, letterSpacing: 2, transform: 'rotate(-3deg)'}}>{reel.cover.kicker}</div>
        <div style={{position: 'relative', fontSize: 104, color: YELLOW, WebkitTextStroke: '12px #0B0F2A', paintOrder: 'stroke fill', whiteSpace: 'nowrap'}}>
          {reel.cover.title}
          <div style={{position: 'absolute', left: -6, right: -6, top: '52%', height: 12, borderRadius: 6, background: RED, transform: 'rotate(-4deg)'}} />
        </div>
        <div style={{fontSize: 50, color: '#FFFFFF', textShadow: '0 4px 14px rgba(0,0,0,0.7)'}}>{reel.cover.sub}</div>
      </div>
    </AbsoluteFill>
  );
};
