import React from 'react';
import {AbsoluteFill, CalculateMetadataFunction, Easing, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import '../fonts';
import {FONT} from '../fonts';
import {C, clamp} from '../theme';
import {CafeBackground} from './CafeBackground';
import {CtaCard, HookCard, PhraseCard, QuizCard} from './cards';
import {CENTER, STICKER_TOP, Stickers} from './Stickers';
import {Base, buildTimeline, Lesson, Manifest, TimedLine, TimedScene, Timeline} from './timeline';

export type LessonProps = {lessonId: string; lesson?: Lesson; timeline?: Timeline};

export const calculateLessonMetadata: CalculateMetadataFunction<LessonProps> = async ({props}) => {
  const get = async <T,>(p: string): Promise<T> => {
    const res = await fetch(staticFile(p));
    if (!res.ok) throw new Error(`Không đọc được ${p} — đã chạy make-voice chưa?`);
    return res.json();
  };
  const lesson = await get<Lesson>(`lessons/${props.lessonId}.json`);
  const manifest = await get<Manifest>(`voice/${props.lessonId}/manifest.json`);
  // Phải khớp fps khi đăng ký <Composition> trong Root.tsx
  const timeline = buildTimeline(lesson, manifest, 30);
  return {durationInFrames: timeline.total, props: {...props, lesson, timeline}};
};

const relative = (s: TimedScene): TimedLine[] => s.lines.map((l) => ({...l, from: l.from - s.from}));
const allLines = (timeline: Timeline<Base>) => timeline.scenes.flatMap((s) => s.lines);

const SceneCard: React.FC<{s: TimedScene; phraseIndex: number; phraseCount: number}> = ({s, phraseIndex, phraseCount}) => {
  const lines = relative(s);
  switch (s.scene.type) {
    case 'hook':
      return <HookCard scene={s.scene} lines={lines} />;
    case 'phrase':
      return <PhraseCard scene={s.scene} lines={lines} index={phraseIndex} count={phraseCount} />;
    case 'quiz':
      return <QuizCard scene={s.scene} lines={lines} />;
    case 'cta':
      return <CtaCard scene={s.scene} lines={lines} />;
  }
};

/** Card mỗi cảnh trượt vào từ bên phải (cảnh đầu thì không) — đi kèm tiếng whoosh */
const CardEnter: React.FC<{skip: boolean; children: React.ReactNode}> = ({skip, children}) => {
  const frame = useCurrentFrame();
  if (skip) return <>{children}</>;
  return (
    <AbsoluteFill
      style={{
        translate: `${interpolate(frame, [0, 10], [180, 0], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)})}px 0px`,
        opacity: interpolate(frame, [0, 6], [0, 1], clamp),
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

const speaking = (timeline: Timeline<Base>, frame: number) => allLines(timeline).find((l) => frame >= l.from && frame < l.from + l.dur);

/** Câu tiếng Anh dạng karaoke: từ đang đọc sáng vàng, từ chưa đọc mờ. Không có mốc thời gian thì hiện cả câu. */
const Karaoke: React.FC<{line: TimedLine}> = ({line}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (!line.words?.length) return <>{line.say}</>;
  const t = (frame - line.from) / fps;
  return (
    <>
      {line.words.map((w, i) => {
        const now = t >= w.start && t < w.end + 0.05;
        const done = t >= w.end;
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              marginRight: '0.28em',
              color: now ? C.yellow : C.white,
              opacity: now || done ? 1 : 0.5,
              scale: now ? '1.08' : '1',
            }}
          >
            {w.w}
          </span>
        );
      })}
    </>
  );
};

// Khung phụ đề luôn hiện và nền đặc: ảnh nhân vật bị cắt ngang ở thắt lưng, khung này che đường cắt
// (nhân vật như đứng sau quầy). Giữa 2 câu thì khung trống chứ không biến mất.
export const Subtitle: React.FC<{timeline: Timeline<Base>}> = ({timeline}) => {
  const frame = useCurrentFrame();
  const line = speaking(timeline, frame);
  const color = line ? (line.speaker === 'com' ? C.blue : C.mint) : 'rgba(255,255,255,0.15)';
  return (
    <div
      style={{
        position: 'absolute',
        left: 60,
        right: 60,
        top: 1380,
        minHeight: 190,
        padding: '20px 32px',
        borderRadius: 28,
        background: '#141A2E',
        border: `4px solid ${color}`,
        boxShadow: '0 -12px 40px rgba(0,0,0,0.35)',
        fontFamily: FONT,
        color: C.white,
        textAlign: 'center',
      }}
    >
      {line ? (
        <div style={{opacity: interpolate(frame, [line.from, line.from + 5], [0, 1], clamp)}}>
          <div style={{fontWeight: 800, fontSize: 34, color}}>{line.speaker === 'com' ? 'Cơm' : 'Mia'}</div>
          <div style={{fontWeight: 800, fontSize: 48, lineHeight: 1.25}}>
            <Karaoke line={line} />
          </div>
          {line.vi ? <div style={{marginTop: 8, fontWeight: 700, fontSize: 40, lineHeight: 1.3, color: '#A7E8D0'}}>{line.vi}</div> : null}
        </div>
      ) : null}
    </div>
  );
};

/** Chữ "nổ" trên đầu người nói (WOW!, Ouch!, Correct!) trong ~1,3 giây đầu câu */
const Burst: React.FC<{line: TimedLine}> = ({line}) => {
  const frame = useCurrentFrame(); // tính từ đầu câu (nằm trong Sequence)
  const side = line.speaker === 'com' ? -1 : 1;
  return (
    <div
      style={{
        position: 'absolute',
        left: CENTER[line.speaker] - 260 + side * 40,
        width: 520,
        top: STICKER_TOP - 70,
        textAlign: 'center',
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: 88,
        color: C.yellow,
        textShadow: `0 6px 0 ${C.red}, 0 12px 30px rgba(0,0,0,0.5)`,
        rotate: `${side * 8}deg`,
        scale: `${interpolate(frame, [0, 8], [0.2, 1], {...clamp, easing: Easing.bezier(0.34, 1.56, 0.64, 1)})}`,
        opacity: interpolate(frame, [30, 40], [1, 0], clamp),
        translate: `0 ${interpolate(frame, [0, 40], [0, -30], clamp)}px`,
      }}
    >
      {line.burst}
    </div>
  );
};

/** Rung màn hình ngắn khi có người đổi sang biểu cảm "wow" */
const Shake: React.FC<{timeline: Timeline; children: React.ReactNode}> = ({timeline, children}) => {
  const frame = useCurrentFrame();
  const hit = allLines(timeline).find((l) => (l.pose === 'wow' || l.listen === 'wow') && frame >= l.from && frame < l.from + 10);
  const k = hit ? interpolate(frame - hit.from, [0, 10], [9, 0], clamp) : 0;
  return <AbsoluteFill style={{translate: `${Math.sin(frame * 2.7) * k}px ${Math.cos(frame * 3.1) * k}px`}}>{children}</AbsoluteFill>;
};

export const LessonVideo: React.FC<LessonProps> = ({lesson, timeline}) => {
  const {durationInFrames, fps} = useVideoConfig();
  if (!lesson || !timeline) throw new Error('Thiếu lesson/timeline: composition phải dùng calculateLessonMetadata');
  const phrases = timeline.scenes.filter((s) => s.scene.type === 'phrase');
  const quiz = timeline.scenes.find((s) => s.scene.type === 'quiz');
  const reveal = quiz?.lines[1];
  const bursts = allLines(timeline).filter((l) => l.burst);
  return (
    <AbsoluteFill>
      {/* nền nằm ngoài Shake: rung cả nền thì mép khung hình bị hở */}
      <CafeBackground />
      <Shake timeline={timeline}>
        <div
          style={{
            position: 'absolute',
            top: 110,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: 40,
            color: C.muted,
          }}
        >
          {lesson.series.toUpperCase()} · BÀI {lesson.number}
        </div>
        {timeline.scenes.map((s, i) => (
          <Sequence key={s.from} name={s.scene.type} from={s.from} durationInFrames={s.dur} layout="none">
            <CardEnter skip={i === 0}>
              <SceneCard s={s} phraseIndex={phrases.indexOf(s) + 1} phraseCount={phrases.length} />
            </CardEnter>
          </Sequence>
        ))}
        <Stickers timeline={timeline} />
        {bursts.map((l) => (
          <Sequence key={`b${l.from}`} name={`Burst ${l.burst}`} from={l.from} durationInFrames={40} layout="none">
            <Burst line={l} />
          </Sequence>
        ))}
      </Shake>
      <Subtitle timeline={timeline} />

      {allLines(timeline).map((l) => (
        <Sequence key={l.file} name={`Voice ${l.speaker}`} from={l.from} durationInFrames={l.dur}>
          <Audio src={staticFile(l.file)} />
        </Sequence>
      ))}
      <Audio
        name="Music"
        src={staticFile('audio/music.wav')}
        volume={(f) => interpolate(f, [0, 15, durationInFrames - 45, durationInFrames], [0, 0.12, 0.12, 0], clamp)}
      />
      {timeline.scenes.slice(1).map((s) => (
        <Sequence key={`w${s.from}`} name="Scene whoosh" from={s.from - 4} durationInFrames={20}>
          <Audio src={staticFile('audio/whoosh.wav')} volume={0.35} />
        </Sequence>
      ))}
      {bursts.map((l) => (
        <Sequence key={`bp${l.from}`} name="Burst pop" from={l.from} durationInFrames={10}>
          <Audio src={staticFile('audio/pop.wav')} volume={0.45} />
        </Sequence>
      ))}
      {reveal?.pauseBefore
        ? Array.from({length: reveal.pauseBefore}).map((_, i) => (
            <Sequence key={`t${i}`} name="Countdown" from={reveal.from - (reveal.pauseBefore! - i) * fps} durationInFrames={8}>
              <Audio src={staticFile('audio/tick.wav')} volume={0.6} />
            </Sequence>
          ))
        : null}
      {reveal ? (
        <Sequence name="Right ding" from={reveal.from} durationInFrames={30}>
          <Audio src={staticFile('audio/ding.wav')} volume={0.5} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
