import React from 'react';
import {Easing, Interactive, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT} from '../fonts';
import {C, clamp} from '../theme';
import type {Scene, TimedLine} from './timeline';

// Mọi card nằm trong vùng y 210–700: phía dưới là nhân vật và phụ đề.
const box: React.CSSProperties = {
  position: 'absolute',
  top: 210,
  left: 80,
  right: 80,
  height: 490,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  fontFamily: FONT,
  color: C.white,
};

const pop = {...clamp, easing: Easing.bezier(0.34, 1.56, 0.64, 1)};

type CardProps<T extends Scene['type']> = {scene: Extract<Scene, {type: T}>; lines: TimedLine[]};

export const HookCard: React.FC<CardProps<'hook'>> = ({scene, lines}) => {
  const frame = useCurrentFrame();
  const fine = lines[1].from;
  const strike = lines[2].from;
  return (
    <div style={box}>
      <Interactive.Div
        name="Hook title"
        style={{
          fontWeight: 900,
          fontSize: 116,
          lineHeight: 1,
          whiteSpace: 'nowrap',
          color: C.yellow,
          textShadow: `0 10px 0 ${C.red}`,
          scale: interpolate(frame, [0, 14], [0.3, 1], {...clamp, easing: Easing.spring({damping: 10}), output: 'perceptual-scale'}),
          rotate: '-3deg',
        }}
      >
        {scene.title}
      </Interactive.Div>
      <div style={{position: 'relative', marginTop: 60, opacity: interpolate(frame, [fine, fine + 8], [0, 1], clamp)}}>
        <div style={{background: C.card, borderRadius: 28, padding: '22px 36px', fontWeight: 800, fontSize: 54, color: C.muted}}>
          {scene.cliche}
        </div>
        <div
          style={{
            position: 'absolute',
            left: 20,
            right: 20,
            top: '50%',
            height: 12,
            borderRadius: 6,
            background: C.red,
            rotate: '-4deg',
            transformOrigin: 'left center',
            scale: `${interpolate(frame, [strike, strike + 10], [0, 1], clamp)} 1`,
          }}
        />
      </div>
      <div style={{marginTop: 40, fontWeight: 700, fontSize: 48, opacity: interpolate(frame, [strike + 6, strike + 16], [0, 1], clamp)}}>
        {scene.subtitle}
      </div>
    </div>
  );
};

export const PhraseCard: React.FC<CardProps<'phrase'> & {index: number; count: number}> = ({scene, index, count}) => {
  const frame = useCurrentFrame();
  return (
    <div style={box}>
      <div
        style={{
          background: C.mint,
          color: C.ink,
          borderRadius: 999,
          padding: '12px 34px',
          fontWeight: 800,
          fontSize: 40,
          opacity: interpolate(frame, [0, 8], [0, 1], clamp),
        }}
      >
        Câu {index}/{count} · {scene.note}
      </div>
      <Interactive.Div
        name="Phrase"
        style={{
          marginTop: 44,
          fontWeight: 900,
          fontSize: 104,
          lineHeight: 1.08,
          color: C.white,
          scale: interpolate(frame, [4, 18], [0.6, 1], {...pop, output: 'perceptual-scale'}),
          opacity: interpolate(frame, [4, 10], [0, 1], clamp),
        }}
      >
        {scene.en}
      </Interactive.Div>
      <div
        style={{
          marginTop: 36,
          fontWeight: 700,
          fontSize: 56,
          color: C.yellow,
          translate: `0 ${interpolate(frame, [14, 26], [30, 0], clamp)}px`,
          opacity: interpolate(frame, [14, 26], [0, 1], clamp),
        }}
      >
        {scene.vi}
      </div>
    </div>
  );
};

export const QuizCard: React.FC<CardProps<'quiz'>> = ({scene, lines}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const reveal = lines[1].from;
  const pause = Math.round((lines[1].pauseBefore ?? 0) * fps);
  const left = Math.ceil((reveal - frame) / fps);
  const counting = frame >= reveal - pause && frame < reveal;
  return (
    <div style={box}>
      <div style={{fontWeight: 900, fontSize: 64, color: C.yellow}}>ĐỐ BẠN!</div>
      <div style={{marginTop: 24, fontWeight: 700, fontSize: 50, lineHeight: 1.3}}>{scene.question}</div>
      <div style={{marginTop: 40, width: '100%', display: 'flex', flexDirection: 'column', gap: 24}}>
        {scene.options.map((o, i) => {
          const right = i === scene.answer;
          const shown = frame >= reveal;
          return (
            <div
              key={o}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 28,
                padding: '22px 34px',
                borderRadius: 28,
                background: shown && right ? C.mint : C.card,
                color: shown && right ? C.ink : C.white,
                opacity: shown && !right ? 0.4 : interpolate(frame, [8 + i * 6, 16 + i * 6], [0, 1], clamp),
                fontWeight: 800,
                fontSize: 60,
                textAlign: 'left',
              }}
            >
              <span style={{color: shown && right ? C.ink : C.yellow}}>{String.fromCharCode(65 + i)}</span>
              <span>{o}</span>
            </div>
          );
        })}
      </div>
      {counting ? (
        // Đặt vào khoảng trống giữa card và nhân vật (tâm x=540, y≈820) để không đè câu hỏi
        <div
          style={{
            position: 'absolute',
            left: 540 - 80 - 90,
            top: 820 - 210 - 90,
            width: 180,
            height: 180,
            borderRadius: '50%',
            background: C.red,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            fontSize: 112,
            boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
            scale: `${interpolate((reveal - frame) % fps, [fps - 8, fps], [1, 1.25], clamp)}`,
          }}
        >
          {left}
        </div>
      ) : null}
    </div>
  );
};

export const CtaCard: React.FC<CardProps<'cta'>> = ({scene}) => {
  const frame = useCurrentFrame();
  return (
    <div style={box}>
      <Interactive.Div
        name="CTA title"
        style={{
          fontWeight: 900,
          fontSize: 120,
          color: C.yellow,
          textShadow: `0 10px 0 ${C.red}`,
          scale: interpolate(frame, [0, 14], [0.4, 1], {...pop, output: 'perceptual-scale'}),
        }}
      >
        {scene.title}
      </Interactive.Div>
      <div style={{marginTop: 36, fontWeight: 700, fontSize: 54, lineHeight: 1.3}}>{scene.subtitle}</div>
      <div
        style={{
          marginTop: 48,
          background: C.blue,
          borderRadius: 999,
          padding: '16px 40px',
          fontWeight: 800,
          fontSize: 46,
          opacity: interpolate(frame, [16, 26], [0, 1], clamp),
        }}
      >
        Follow để học bài tiếp theo
      </div>
    </div>
  );
};
