import React from 'react';
import {AbsoluteFill, CalculateMetadataFunction, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import '../fonts';
import {Background} from '../components/Background';
import {FONT} from '../fonts';
import {C, clamp} from '../theme';
import {CtaCard, HookCard, PhraseCard, QuizCard} from './cards';
import {Stickers} from './Stickers';
import {buildTimeline, Lesson, Manifest, TimedLine, TimedScene, Timeline} from './timeline';

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

const speaking = (timeline: Timeline, frame: number) =>
  timeline.scenes.flatMap((s) => s.lines).find((l) => frame >= l.from && frame < l.from + l.dur);

const Subtitle: React.FC<{timeline: Timeline}> = ({timeline}) => {
  const frame = useCurrentFrame();
  const line = speaking(timeline, frame);
  if (!line) return null;
  const color = line.speaker === 'com' ? C.blue : C.mint;
  return (
    <div
      style={{
        position: 'absolute',
        left: 80,
        right: 80,
        top: 1380,
        padding: '20px 32px',
        borderRadius: 28,
        background: 'rgba(14,18,32,0.88)',
        border: `4px solid ${color}`,
        fontFamily: FONT,
        color: C.white,
        textAlign: 'center',
        opacity: interpolate(frame, [line.from, line.from + 5], [0, 1], clamp),
      }}
    >
      <div style={{fontWeight: 800, fontSize: 34, color}}>{line.speaker === 'com' ? 'Cơm' : 'Mia'}</div>
      <div style={{fontWeight: 800, fontSize: 48, lineHeight: 1.25}}>{line.say}</div>
      {line.vi ? <div style={{marginTop: 8, fontWeight: 700, fontSize: 40, lineHeight: 1.3, color: C.yellow}}>{line.vi}</div> : null}
    </div>
  );
};

export const LessonVideo: React.FC<LessonProps> = ({lesson, timeline}) => {
  const {durationInFrames, fps} = useVideoConfig();
  if (!lesson || !timeline) throw new Error('Thiếu lesson/timeline: composition phải dùng calculateLessonMetadata');
  const phrases = timeline.scenes.filter((s) => s.scene.type === 'phrase');
  const quiz = timeline.scenes.find((s) => s.scene.type === 'quiz');
  const reveal = quiz?.lines[1];
  return (
    <AbsoluteFill>
      <Background a={C.mint} b={C.blue} />
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
      {timeline.scenes.map((s) => (
        <Sequence key={s.from} name={s.scene.type} from={s.from} durationInFrames={s.dur} layout="none">
          <SceneCard s={s} phraseIndex={phrases.indexOf(s) + 1} phraseCount={phrases.length} />
        </Sequence>
      ))}
      <Stickers timeline={timeline} />
      <Subtitle timeline={timeline} />

      {timeline.scenes.flatMap((s) => s.lines).map((l) => (
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
        <Sequence key={`p${s.from}`} name="Scene pop" from={s.from} durationInFrames={10}>
          <Audio src={staticFile('audio/pop.wav')} volume={0.4} />
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
