import React from 'react';
import {AbsoluteFill, Easing, Interactive, interpolate, useCurrentFrame} from 'remotion';
import {Background} from '../components/Background';
import {Bubble} from '../components/Bubble';
import {FONT} from '../fonts';
import {FrontChar} from '../rig/FrontChar';
import {v} from '../rig/math';
import {clamp} from '../theme';

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const tiX = interpolate(frame, [70, 88], [540, 320], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)});
  const coachX = interpolate(frame, [68, 88], [1350, 790], {...clamp, easing: Easing.bezier(0.2, 1.3, 0.4, 1)});
  const tiMood = frame < 78 ? 'sad' : frame < 140 ? 'shock' : 'happy';
  const tiTalk = frame > 12 && frame < 70 ? Math.abs(Math.sin(frame * 0.55)) : 0;
  const coachTalk = frame > 100 && frame < 190 ? Math.abs(Math.sin(frame * 0.5)) : 0;
  const flex = interpolate(frame, [100, 112], [0, 1], {...clamp, easing: Easing.spring({damping: 10})});
  const bob = Math.sin(frame / 6) * 4;

  return (
    <AbsoluteFill>
      <Background />
      <Interactive.Div
        name="Kicker"
        style={{
          position: 'absolute',
          top: 150,
          left: 80,
          right: 80,
          textAlign: 'center',
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: 60,
          color: '#FFFFFF',
          opacity: interpolate(frame, [0, 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        }}
      >
        GIÁO ÁN 1 NGÀY
      </Interactive.Div>
      <Interactive.Div
        name="Big title"
        style={{
          position: 'absolute',
          top: 225,
          left: 40,
          right: 40,
          textAlign: 'center',
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 156,
          lineHeight: 1,
          color: '#FFD23F',
          textShadow: '0 12px 0 #FF4D4D',
          scale: interpolate(frame, [2, 18], [0.3, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.spring({damping: 10}),
            output: 'perceptual-scale',
          }),
          rotate: '-3deg',
        }}
      >
        TẬP NGỰC
      </Interactive.Div>

      <AbsoluteFill>
        <svg width={1080} height={1920} viewBox="0 0 1080 1920">
          <ellipse cx={tiX} cy={1565} rx={110} ry={18} fill="rgba(0,0,0,0.35)" />
          <ellipse cx={coachX} cy={1565} rx={130} ry={20} fill="rgba(0,0,0,0.35)" />
          <FrontChar who="ti" x={tiX} y={1560 + (frame > 140 ? bob : 0)} s={1.3} mood={tiMood} mouth={tiTalk} blink={frame % 70 > 66} />
          <FrontChar
            who="coach"
            x={coachX}
            y={1560}
            s={1.3}
            mood={frame < 100 ? 'happy' : 'proud'}
            mouth={coachTalk}
            blink={frame % 80 > 76}
            handR={v(95 + flex * 70, -255 - flex * 330)}
          />
        </svg>
      </AbsoluteFill>

      <Bubble x={140} y={470} w={800} from={8} to={92} tailX={400}>
        Tập ngực cả tháng mà vẫn… phẳng lì?
      </Bubble>
      <Bubble x={250} y={470} w={760} from={98} tailX={540} color="#FFD23F">
        Thiếu giáo án thôi! Tập theo buổi này nè.
      </Bubble>
    </AbsoluteFill>
  );
};
