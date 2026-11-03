import React from 'react';
import {AbsoluteFill, CalculateMetadataFunction, Img, staticFile} from 'remotion';
import '../fonts';
import {FONT} from '../fonts';
import {C} from '../theme';
import {CafeBackground} from './CafeBackground';
import type {Lesson} from './timeline';

// Ảnh bìa (thumbnail) của 1 bài. Facebook mặc định lấy khung hình đầu của video làm ảnh preview,
// mà khung đầu chỉ có nền trống (chữ và nhân vật còn đang bay vào) — nên mỗi bài có ảnh bìa riêng,
// gắn vào video sau khi upload (scripts/set-thumbnail.mjs).
// Lưới video trên Page cắt ảnh 9:16 thành gần vuông ở giữa (y ~420–1500), nên chữ chính nằm trong vùng đó.

export type CoverProps = {lessonId: string; lesson?: Lesson};

export const calculateCoverMetadata: CalculateMetadataFunction<CoverProps> = async ({props}) => {
  const res = await fetch(staticFile(`lessons/${props.lessonId}.json`));
  if (!res.ok) throw new Error(`Không đọc được lessons/${props.lessonId}.json`);
  return {props: {...props, lesson: await res.json()}};
};

const W = 760;
const H = Math.round((W * 305) / 410); // cùng tỉ lệ ô ảnh nhân vật như trong Stickers.tsx
const BOTTOM = 1640;

export const LessonCover: React.FC<CoverProps> = ({lesson}) => {
  if (!lesson) throw new Error('Thiếu lesson: composition phải dùng calculateCoverMetadata');
  const hook = lesson.scenes[0];
  if (hook.type !== 'hook') throw new Error('Cảnh đầu của bài phải là hook');
  // subtitle luôn có dạng: Đừng chỉ nói "Thank you" → tách phần trong ngoặc ra làm chữ to bị gạch
  const m = hook.subtitle.match(/^(.*?)\s*"(.+)"$/);
  const lead = m ? m[1] : hook.subtitle;
  const quote = m ? m[2] : hook.cliche;
  // cỡ chữ co theo độ dài để câu dài vẫn nằm gọn 1 dòng (~0,47em mỗi ký tự với font này, rộng tối đa ~860px)
  const size = Math.min(150, Math.floor(1700 / (quote.length + 2)));
  const phraseCount = lesson.scenes.filter((s) => s.type === 'phrase').length;
  return (
    <AbsoluteFill style={{fontFamily: FONT, color: C.white, textAlign: 'center'}}>
      <CafeBackground />
      <div style={{position: 'absolute', top: 320, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 20}}>
        <div style={{background: C.blue, borderRadius: 999, padding: '14px 34px', fontWeight: 900, fontSize: 44}}>TIẾNG ANH MỖI NGÀY</div>
        <div style={{background: C.yellow, color: C.ink, borderRadius: 999, padding: '14px 34px', fontWeight: 900, fontSize: 44}}>
          BÀI {lesson.number}
        </div>
      </div>
      <div style={{position: 'absolute', top: 510, left: 60, right: 60, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <div style={{fontWeight: 900, fontSize: 84, textShadow: '0 6px 24px rgba(0,0,0,0.6)'}}>{lead}</div>
        <div style={{position: 'relative', marginTop: 34, rotate: '-3deg'}}>
          <div
            style={{
              background: C.card,
              border: `6px solid ${C.white}`,
              borderRadius: 36,
              padding: '18px 44px',
              fontWeight: 900,
              fontSize: size,
              lineHeight: 1.1,
              color: C.yellow,
              whiteSpace: 'nowrap',
            }}
          >
            “{quote}”
          </div>
          <div style={{position: 'absolute', left: 10, right: 10, top: '50%', height: 18, borderRadius: 9, background: C.red, rotate: '-6deg'}} />
        </div>
        <div style={{marginTop: 46, background: C.mint, color: C.ink, borderRadius: 999, padding: '14px 40px', fontWeight: 900, fontSize: 56}}>
          {phraseCount} câu hay hơn ↓
        </div>
      </div>
      <Img src={staticFile('characters/com/embarrassed.png')} style={{position: 'absolute', width: W, height: H, left: 290 - W / 2, top: BOTTOM - H}} />
      <Img src={staticFile('characters/mia/point.png')} style={{position: 'absolute', width: W, height: H, left: 790 - W / 2, top: BOTTOM - H}} />
      {/* che đường cắt ngang thắt lưng của ảnh nhân vật, giống khung phụ đề trong video */}
      <div style={{position: 'absolute', left: 0, right: 0, top: BOTTOM - 40, bottom: 0, background: '#141A2E', borderTop: `8px solid ${C.yellow}`}} />
    </AbsoluteFill>
  );
};
