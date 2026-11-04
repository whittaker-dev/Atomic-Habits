import React from 'react';
import {AbsoluteFill, CalculateMetadataFunction, Easing, Img, interpolate, interpolateColors, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import '../fonts';
import {FONT} from '../fonts';
import {C, clamp} from '../theme';
import {CafeBackground} from './CafeBackground';
import {Subtitle} from './LessonVideo';
import {Stickers} from './Stickers';
import {Base, buildTimeline, Manifest, TimedScene, Timeline} from './timeline';

// Video "Đoán từ": mỗi từ hiện nghĩa tiếng Việt + hình, đếm ngược 5 giây, rồi Mia đọc đáp án và Cơm lặp lại.
// Kịch bản: public/lessons/<id>.json (cảnh intro → word… → outro). Câu đầu của mỗi từ có `pauseBefore: 5`:
// buildTimeline chèn 5 giây trống trước câu đó, chính là lúc đếm ngược (Stickers tự cho 2 nhân vật "think").
type IconName = 'book' | 'pencil' | 'teacher' | 'ruler' | 'eraser' | 'backpack' | 'classroom' | 'homework';
type WordScene = Base & {type: 'word'; vi: string; en: string; icon: IconName};
export type QuizScene = (Base & {type: 'intro'}) | WordScene | (Base & {type: 'outro'});
type WordQuiz = {id: string; series: string; number: number; topic: string; scenes: QuizScene[]};

export type WordQuizProps = {quizId: string; quiz?: WordQuiz; timeline?: Timeline<QuizScene>};

export const calculateWordQuizMetadata: CalculateMetadataFunction<WordQuizProps> = async ({props}) => {
  const get = async <T,>(p: string): Promise<T> => {
    const res = await fetch(staticFile(p));
    if (!res.ok) throw new Error(`Không đọc được ${p} — đã chạy make-voice chưa?`);
    return res.json();
  };
  const quiz = await get<WordQuiz>(`lessons/${props.quizId}.json`);
  const manifest = await get<Manifest>(`voice/${props.quizId}/manifest.json`);
  // Phải khớp fps khi đăng ký <Composition> trong Root.tsx
  const timeline = buildTimeline(quiz, manifest, 30);
  return {durationInFrames: timeline.total, props: {...props, quiz, timeline}};
};

const pop = {...clamp, easing: Easing.bezier(0.34, 1.56, 0.64, 1)};
const ease = {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)};

// Hình minh hoạ vẽ bằng SVG (Chrome headless không có font emoji). Khung 200×200.
const ICONS: Record<IconName, React.ReactNode> = {
  book: (
    <>
      <rect x="48" y="30" width="108" height="140" rx="10" fill={C.blue} />
      <rect x="48" y="30" width="22" height="140" rx="6" fill="#2A7FD0" />
      <rect x="66" y="152" width="90" height="12" fill={C.white} />
      <rect x="86" y="62" width="52" height="20" rx="5" fill={C.yellow} />
    </>
  ),
  pencil: (
    <g transform="rotate(-40 100 100)">
      <rect x="14" y="82" width="20" height="36" rx="6" fill="#FF8FA3" />
      <rect x="30" y="82" width="12" height="36" fill="#C9CED6" />
      <rect x="42" y="82" width="100" height="36" fill={C.yellow} />
      <rect x="42" y="95" width="100" height="10" fill="#F2B705" />
      <polygon points="142,82 182,100 142,118" fill="#F5D7A1" />
      <polygon points="168,94 182,100 168,106" fill={C.ink} />
    </g>
  ),
  teacher: (
    <>
      <path d="M40 182 Q40 118 100 112 Q160 118 160 182 Z" fill={C.red} />
      <path d="M86 112 L100 140 L114 112 Z" fill={C.white} />
      <circle cx="100" cy="72" r="34" fill="#F2C29B" />
      <path d="M64 70 Q66 30 100 32 Q136 30 136 70 Q122 50 100 52 Q78 50 64 70 Z" fill="#3B2A20" />
      <circle cx="87" cy="76" r="10" fill="none" stroke={C.ink} strokeWidth="4" />
      <circle cx="113" cy="76" r="10" fill="none" stroke={C.ink} strokeWidth="4" />
      <line x1="97" y1="76" x2="103" y2="76" stroke={C.ink} strokeWidth="4" />
      <path d="M90 92 Q100 99 110 92" fill="none" stroke={C.ink} strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  ruler: (
    <g transform="rotate(-12 100 100)">
      <rect x="18" y="72" width="164" height="56" rx="8" fill={C.yellow} />
      {Array.from({length: 11}).map((_, i) => (
        <line key={i} x1={32 + i * 14} y1="72" x2={32 + i * 14} y2={i % 2 ? 88 : 100} stroke={C.ink} strokeWidth="4" />
      ))}
    </g>
  ),
  eraser: (
    <g transform="rotate(-18 100 100)">
      <rect x="34" y="68" width="132" height="64" rx="14" fill="#FF8FA3" />
      <rect x="98" y="68" width="68" height="64" fill={C.blue} />
      <rect x="98" y="68" width="68" height="64" rx="0" fill="none" stroke="#2A7FD0" strokeWidth="4" />
    </g>
  ),
  backpack: (
    <>
      <path d="M78 58 Q100 18 122 58" fill="none" stroke={C.ink} strokeWidth="9" strokeLinecap="round" />
      <rect x="48" y="52" width="104" height="128" rx="32" fill={C.red} />
      <rect x="66" y="112" width="68" height="54" rx="14" fill="#D63A3A" />
      <line x1="76" y1="126" x2="124" y2="126" stroke={C.yellow} strokeWidth="5" strokeLinecap="round" />
      <rect x="70" y="70" width="60" height="10" rx="5" fill="#D63A3A" />
    </>
  ),
  classroom: (
    <>
      <rect x="22" y="28" width="156" height="104" rx="8" fill="#1F6E4F" stroke="#8B5A2B" strokeWidth="9" />
      <text x="100" y="96" textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize="44" fill={C.white}>
        ABC
      </text>
      <rect x="52" y="148" width="96" height="14" rx="4" fill="#C98A4B" />
      <rect x="60" y="160" width="10" height="26" fill="#8B5A2B" />
      <rect x="130" y="160" width="10" height="26" fill="#8B5A2B" />
    </>
  ),
  homework: (
    <>
      <rect x="44" y="26" width="116" height="150" rx="8" fill={C.white} />
      {[56, 76, 96, 116, 136, 156].map((y) => (
        <line key={y} x1="62" y1={y} x2="148" y2={y} stroke="#B9D6F2" strokeWidth="3" />
      ))}
      {[46, 76, 106, 136, 162].map((y) => (
        <circle key={y} cx="44" cy={y} r="7" fill="#C9CED6" />
      ))}
      <polygon points="80,104 104,82 128,104" fill={C.red} />
      <rect x="86" y="104" width="36" height="32" fill={C.yellow} />
      <rect x="99" y="116" width="10" height="20" fill="#8B5A2B" />
    </>
  ),
};

const CENTER_X = 540;
const RING_Y = 350; // tâm vòng đếm ngược, bao quanh hình minh hoạ
const RING_R = 125;

const Check: React.FC<{size: number}> = ({size}) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <path d="M24 52 L43 70 L77 32" fill="none" stroke={C.ink} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Vòng tròn cạn dần trong 5 giây quanh hình, có số đếm ở đáy; ra đáp án thì vòng đầy màu mint và số đổi thành dấu tích. */
const CountdownRing: React.FC<{scene: WordScene; reveal: number}> = ({scene, reveal}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const done = frame >= reveal;
  const left = interpolate(frame, [0, reveal], [1, 0], clamp);
  const color = done ? C.mint : interpolateColors(left, [0, 0.4, 1], [C.red, C.yellow, C.mint]);
  const n = Math.max(1, Math.ceil((reveal - frame) / fps));
  const tickAge = done ? frame - reveal : (frame - (reveal - n * fps)) % fps; // khung hình kể từ lần đổi số gần nhất
  const len = 2 * Math.PI * RING_R;
  return (
    <div style={{position: 'absolute', left: CENTER_X - 160, top: RING_Y - 160, width: 320, height: 320}}>
      <svg width={320} height={320} viewBox="0 0 320 320">
        <circle cx="160" cy="160" r={RING_R} fill="rgba(14,18,32,0.72)" stroke="rgba(255,255,255,0.14)" strokeWidth="16" />
        <circle
          cx="160"
          cy="160"
          r={RING_R}
          fill="none"
          stroke={color}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${len * (done ? 1 : left)} ${len}`}
          transform="rotate(-90 160 160)"
        />
        <g transform={`translate(80 76) scale(0.8)`}>
          <g style={{transformOrigin: '100px 100px', scale: `${interpolate(frame, [0, 14], [0.4, 1], pop) * (done ? interpolate(tickAge, [0, 6, 14], [1, 1.15, 1], clamp) : 1)}`}}>
            {ICONS[scene.icon]}
          </g>
        </g>
      </svg>
      <div
        style={{
          position: 'absolute',
          left: 160 - 52,
          top: 160 + RING_R - 52,
          width: 104,
          height: 104,
          borderRadius: 52,
          background: color,
          border: `6px solid ${C.bg}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 60,
          color: C.ink,
          scale: `${interpolate(tickAge, [0, 5, 10], [1.25, 0.95, 1], clamp)}`,
        }}
      >
        {done ? <Check size={64} /> : n}
      </div>
    </div>
  );
};

/** Ô chữ: lúc đầu chỉ có ô trống (biết từ dài mấy chữ), còn 2 giây thì lộ chữ đầu, ra đáp án thì lật từng ô. */
const LetterTiles: React.FC<{word: string; reveal: number}> = ({word, reveal}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const letters = word.toUpperCase().split('');
  const gap = 12;
  const size = Math.min(118, (920 - (letters.length - 1) * gap) / letters.length);
  const hintAt = reveal - 2 * fps;
  return (
    <div style={{position: 'absolute', top: 690, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap}}>
      {letters.map((ch, i) => {
        const flipAt = reveal + i * 3;
        const flipped = frame >= flipAt;
        const hint = i === 0 && frame >= hintAt && !flipped;
        return (
          <div
            key={i}
            style={{
              width: size,
              height: size * 1.12,
              borderRadius: 18,
              background: flipped ? C.mint : '#141A2E',
              border: `4px solid ${flipped ? C.mint : hint ? C.yellow : 'rgba(255,255,255,0.3)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: FONT,
              fontWeight: 900,
              fontSize: size * 0.66,
              color: flipped ? C.ink : C.yellow,
              opacity: interpolate(frame, [4 + i * 2, 10 + i * 2], [0, 1], clamp),
              scale: `${flipped ? interpolate(frame, [flipAt, flipAt + 8], [0.6, 1], pop) : 1}`,
              rotate: `${flipped ? interpolate(frame, [flipAt, flipAt + 8], [-12, 0], ease) : 0}deg`,
            }}
          >
            {flipped || hint ? ch : ''}
          </div>
        );
      })}
    </div>
  );
};

const WordCard: React.FC<{s: TimedScene<QuizScene>}> = ({s}) => {
  const frame = useCurrentFrame();
  const scene = s.scene as WordScene;
  const reveal = s.lines[0].from - s.from;
  const done = frame >= reveal;
  return (
    <AbsoluteFill style={{fontFamily: FONT, color: C.white, textAlign: 'center'}}>
      <CountdownRing scene={scene} reveal={reveal} />
      <div
        style={{
          position: 'absolute',
          top: 535,
          left: 60,
          right: 60,
          fontWeight: 900,
          fontSize: 100,
          lineHeight: 1.1,
          color: C.yellow,
          textShadow: `0 8px 0 ${C.red}, 0 14px 30px rgba(0,0,0,0.45)`,
          whiteSpace: 'nowrap',
          scale: `${interpolate(frame, [2, 14], [0.3, 1], pop)}`,
        }}
      >
        {scene.vi}
      </div>
      <LetterTiles word={scene.en} reveal={reveal} />
      <div
        style={{
          position: 'absolute',
          top: 840,
          left: 0,
          right: 0,
          fontWeight: 800,
          fontSize: 44,
          color: done ? C.mint : C.white,
          opacity: interpolate(frame, [10, 18], [0, 1], clamp),
        }}
      >
        {done ? 'Chính xác!' : 'Tiếng Anh là gì?'}
      </div>
    </AbsoluteFill>
  );
};

const IntroCard: React.FC<{quiz: WordQuiz; words: number}> = ({quiz, words}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{fontFamily: FONT, color: C.white, textAlign: 'center', alignItems: 'center'}}>
      <div
        style={{
          position: 'absolute',
          top: 250,
          fontWeight: 900,
          fontSize: 140,
          lineHeight: 1.02,
          color: C.yellow,
          textShadow: `0 10px 0 ${C.red}`,
          rotate: '-3deg',
          scale: `${interpolate(frame, [0, 14], [0.3, 1], pop)}`,
        }}
      >
        ĐOÁN TỪ
        <br />
        TIẾNG ANH
      </div>
      <div
        style={{
          position: 'absolute',
          top: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          padding: '14px 40px 14px 18px',
          borderRadius: 60,
          background: C.card,
          border: `4px solid ${C.blue}`,
          fontWeight: 900,
          fontSize: 56,
          translate: `0 ${interpolate(frame, [12, 24], [60, 0], ease)}px`,
          opacity: interpolate(frame, [12, 20], [0, 1], clamp),
        }}
      >
        <svg width={90} height={90} viewBox="0 0 200 200">
          {ICONS.backpack}
        </svg>
        Chủ đề: {quiz.topic}
      </div>
      <div
        style={{
          position: 'absolute',
          top: 760,
          fontWeight: 800,
          fontSize: 44,
          color: C.muted,
          opacity: interpolate(frame, [22, 30], [0, 1], clamp),
        }}
      >
        {words} từ · mỗi từ 5 giây
      </div>
    </AbsoluteFill>
  );
};

/** Cuối video: bảng ôn lại cả danh sách (người xem hay chụp màn hình/lưu lại để học). */
const OutroCard: React.FC<{words: WordScene[]}> = ({words}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{fontFamily: FONT, color: C.white, textAlign: 'center', alignItems: 'center'}}>
      <div
        style={{
          position: 'absolute',
          top: 215,
          fontWeight: 900,
          fontSize: 84,
          color: C.yellow,
          textShadow: `0 8px 0 ${C.red}`,
          scale: `${interpolate(frame, [0, 14], [0.3, 1], pop)}`,
        }}
      >
        Bạn đúng mấy từ?
      </div>
      <div style={{position: 'absolute', top: 360, left: 70, right: 70, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}}>
        {words.map((w, i) => (
          <div
            key={w.en}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '10px 18px',
              borderRadius: 22,
              background: 'rgba(20,26,46,0.88)',
              textAlign: 'left',
              opacity: interpolate(frame, [8 + i * 3, 14 + i * 3], [0, 1], clamp),
              translate: `0 ${interpolate(frame, [8 + i * 3, 16 + i * 3], [30, 0], ease)}px`,
            }}
          >
            <svg width={76} height={76} viewBox="0 0 200 200" style={{flexShrink: 0}}>
              {ICONS[w.icon]}
            </svg>
            <div>
              <div style={{fontWeight: 900, fontSize: 46, color: C.mint, lineHeight: 1.1}}>{w.en}</div>
              <div style={{fontWeight: 700, fontSize: 32, color: C.muted, lineHeight: 1.2}}>{w.vi}</div>
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/** Dòng chấm tiến độ: từ đã qua màu mint, từ đang đoán màu vàng và to hơn. */
const Progress: React.FC<{timeline: Timeline<QuizScene>}> = ({timeline}) => {
  const frame = useCurrentFrame();
  const words = timeline.scenes.filter((s) => s.scene.type === 'word');
  return (
    <div style={{position: 'absolute', top: 172, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14}}>
      {words.map((s) => {
        const now = frame >= s.from && frame < s.from + s.dur;
        const past = frame >= s.from + s.dur;
        return (
          <div
            key={s.from}
            style={{
              width: now ? 40 : 18,
              height: 18,
              borderRadius: 9,
              background: now ? C.yellow : past ? C.mint : 'rgba(255,255,255,0.25)',
            }}
          />
        );
      })}
    </div>
  );
};

export const WordQuizVideo: React.FC<WordQuizProps> = ({quiz, timeline}) => {
  const {durationInFrames, fps} = useVideoConfig();
  if (!quiz || !timeline) throw new Error('Thiếu quiz/timeline: composition phải dùng calculateWordQuizMetadata');
  const words = timeline.scenes.filter((s) => s.scene.type === 'word');
  const allLines = timeline.scenes.flatMap((s) => s.lines);
  return (
    <AbsoluteFill>
      <CafeBackground />
      <div
        style={{position: 'absolute', top: 110, left: 0, right: 0, textAlign: 'center', fontFamily: FONT, fontWeight: 800, fontSize: 40, color: C.muted}}
      >
        {quiz.series.toUpperCase()} · {quiz.topic.toUpperCase()}
      </div>
      <Progress timeline={timeline} />
      {timeline.scenes.map((s) => (
        <Sequence key={s.from} name={s.scene.type === 'word' ? s.scene.en : s.scene.type} from={s.from} durationInFrames={s.dur} layout="none">
          {s.scene.type === 'intro' ? <IntroCard quiz={quiz} words={words.length} /> : null}
          {s.scene.type === 'word' ? <WordCard s={s} /> : null}
          {s.scene.type === 'outro' ? <OutroCard words={words.map((w) => w.scene as WordScene)} /> : null}
        </Sequence>
      ))}
      <Stickers timeline={timeline} />
      <Subtitle timeline={timeline} />

      {allLines.map((l) => (
        <Sequence key={l.file} name={`Voice ${l.speaker}`} from={l.from} durationInFrames={l.dur}>
          <Audio src={staticFile(l.file)} />
        </Sequence>
      ))}
      <Audio
        name="Music"
        src={staticFile('audio/music.wav')}
        volume={(f) => interpolate(f, [0, 15, durationInFrames - 45, durationInFrames], [0, 0.1, 0.1, 0], clamp)}
      />
      {timeline.scenes.slice(1).map((s) => (
        <Sequence key={`w${s.from}`} name="Scene whoosh" from={s.from - 4} durationInFrames={20}>
          <Audio src={staticFile('audio/whoosh.wav')} volume={0.35} />
        </Sequence>
      ))}
      {words.map((s) => {
        const reveal = s.lines[0].from;
        return (
          <React.Fragment key={`c${s.from}`}>
            {[5, 4, 3, 2, 1].map((k) => (
              <Sequence key={k} name={`Tick ${k}`} from={reveal - k * fps} durationInFrames={8}>
                <Audio src={staticFile('audio/tick.wav')} volume={0.6} />
              </Sequence>
            ))}
            <Sequence name="Right ding" from={reveal} durationInFrames={30}>
              <Audio src={staticFile('audio/ding.wav')} volume={0.5} />
            </Sequence>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

// Ảnh bìa: cùng lý do với LessonCover (khung đầu video chỉ có nền trống). Lưới video trên Page cắt ảnh 9:16
// thành gần vuông ở giữa (y ~420–1500), nên chữ chính và hình nằm trong vùng đó.
export type WordQuizCoverProps = {quizId: string; quiz?: WordQuiz};

export const calculateWordQuizCoverMetadata: CalculateMetadataFunction<WordQuizCoverProps> = async ({props}) => {
  const res = await fetch(staticFile(`lessons/${props.quizId}.json`));
  if (!res.ok) throw new Error(`Không đọc được lessons/${props.quizId}.json`);
  return {props: {...props, quiz: await res.json()}};
};

const COVER_W = 760;
const COVER_H = Math.round((COVER_W * 305) / 410); // cùng tỉ lệ ô ảnh nhân vật như trong Stickers.tsx
const COVER_BOTTOM = 1640;

export const WordQuizCover: React.FC<WordQuizCoverProps> = ({quiz}) => {
  if (!quiz) throw new Error('Thiếu quiz: composition phải dùng calculateWordQuizCoverMetadata');
  const words = quiz.scenes.filter((s): s is WordScene => s.type === 'word');
  return (
    <AbsoluteFill style={{fontFamily: FONT, color: C.white, textAlign: 'center'}}>
      <CafeBackground />
      <div style={{position: 'absolute', top: 320, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 20}}>
        <div style={{background: C.blue, borderRadius: 999, padding: '14px 34px', fontWeight: 900, fontSize: 44}}>ĐOÁN TỪ TIẾNG ANH</div>
        <div style={{background: C.yellow, color: C.ink, borderRadius: 999, padding: '14px 34px', fontWeight: 900, fontSize: 44}}>
          {quiz.topic.toUpperCase()}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 450,
          left: 0,
          right: 0,
          fontWeight: 900,
          fontSize: 136,
          lineHeight: 1.05,
          color: C.yellow,
          textShadow: `0 10px 0 ${C.red}, 0 18px 40px rgba(0,0,0,0.5)`,
          rotate: '-3deg',
        }}
      >
        Bạn đoán được
        <br />
        mấy từ?
      </div>
      <div style={{position: 'absolute', top: 770, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 24}}>
        {words.slice(0, 4).map((w) => (
          <div key={w.en} style={{position: 'relative', width: 190, height: 190, borderRadius: 36, background: 'rgba(20,26,46,0.9)', border: '5px solid rgba(255,255,255,0.25)'}}>
            <svg width={190} height={190} viewBox="-15 -15 230 230">
              {ICONS[w.icon]}
            </svg>
            <div
              style={{
                position: 'absolute',
                right: -14,
                top: -14,
                width: 64,
                height: 64,
                borderRadius: 32,
                background: C.mint,
                color: C.ink,
                fontWeight: 900,
                fontSize: 44,
                lineHeight: '64px',
              }}
            >
              ?
            </div>
          </div>
        ))}
      </div>
      <Img src={staticFile('characters/com/think.png')} style={{position: 'absolute', width: COVER_W, height: COVER_H, left: 290 - COVER_W / 2, top: COVER_BOTTOM - COVER_H}} />
      <Img src={staticFile('characters/mia/think.png')} style={{position: 'absolute', width: COVER_W, height: COVER_H, left: 790 - COVER_W / 2, top: COVER_BOTTOM - COVER_H}} />
      {/* nằm trên lớp nhân vật để tóc không che */}
      <div style={{position: 'absolute', top: 990, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
        <div style={{background: C.mint, color: C.ink, borderRadius: 999, padding: '12px 40px', fontWeight: 900, fontSize: 52}}>
          {words.length} từ · 5 giây mỗi từ
        </div>
      </div>
      {/* che đường cắt ngang thắt lưng của ảnh nhân vật, giống khung phụ đề trong video */}
      <div style={{position: 'absolute', left: 0, right: 0, top: COVER_BOTTOM - 40, bottom: 0, background: '#141A2E', borderTop: `8px solid ${C.yellow}`}} />
    </AbsoluteFill>
  );
};
