import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';

// Bối cảnh quán cà phê vẽ bằng hình khối rồi làm nhòe như ảnh chụp xoá phông, để hợp với nhân vật 3D
// mà không cần ảnh AI. Lớp phủ tối phía trên giữ chữ trắng/vàng của các card dễ đọc.

const BOKEH = [
  {x: 140, y: 380, r: 46, c: '#FFD27A'},
  {x: 930, y: 300, r: 60, c: '#FFC15E'},
  {x: 760, y: 560, r: 34, c: '#FFE2A8'},
  {x: 260, y: 760, r: 54, c: '#FFB547'},
  {x: 980, y: 820, r: 40, c: '#FFD27A'},
  {x: 520, y: 240, r: 28, c: '#FFF0C8'},
  {x: 60, y: 1040, r: 38, c: '#FFC15E'},
  {x: 640, y: 960, r: 30, c: '#FFE2A8'},
];

const Pendant: React.FC<{x: number; len: number}> = ({x, len}) => (
  <>
    <div style={{position: 'absolute', left: x - 3, top: 0, width: 6, height: len, background: '#2A1D17'}} />
    <div
      style={{
        position: 'absolute',
        left: x - 70,
        top: len - 10,
        width: 140,
        height: 80,
        borderRadius: '70px 70px 12px 12px',
        background: '#C9873E',
      }}
    />
    <div
      style={{
        position: 'absolute',
        left: x - 160,
        top: len + 20,
        width: 320,
        height: 320,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,214,140,0.9) 0%, rgba(255,190,100,0.35) 35%, rgba(255,190,100,0) 70%)',
      }}
    />
  </>
);

const Plant: React.FC<{x: number; y: number; s: number}> = ({x, y, s}) => (
  <div style={{position: 'absolute', left: x, top: y, width: 260 * s, height: 360 * s}}>
    {[
      [20, 40, 140, 200, '#3F8A55'],
      [100, 0, 150, 220, '#4E9D62'],
      [60, 110, 170, 200, '#356F47'],
    ].map(([l, t, w, h, c]) => (
      <div key={`${l}-${t}`} style={{position: 'absolute', left: Number(l) * s, top: Number(t) * s, width: Number(w) * s, height: Number(h) * s, borderRadius: '50%', background: String(c)}} />
    ))}
    <div style={{position: 'absolute', left: 70 * s, top: 270 * s, width: 120 * s, height: 90 * s, borderRadius: `0 0 ${30 * s}px ${30 * s}px`, background: '#B8693A'}} />
  </div>
);

export const CafeBackground: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{backgroundColor: '#2B1E18', overflow: 'hidden'}}>
      <AbsoluteFill style={{filter: 'blur(16px)', scale: '1.06'}}>
        {/* tường gỗ ấm + sàn */}
        <AbsoluteFill style={{background: 'linear-gradient(180deg, #5A3D2E 0%, #47301F 55%, #2E1F16 100%)'}} />
        {/* cửa sổ lớn có ánh sáng ban ngày */}
        <div style={{position: 'absolute', left: 560, top: 180, width: 460, height: 720, borderRadius: 20, background: '#FFE9C2'}} />
        <div style={{position: 'absolute', left: 560, top: 180, width: 460, height: 720, borderRadius: 20, background: 'linear-gradient(180deg, #CFE8F2 0%, #FFE9C2 70%)', opacity: 0.85}} />
        <div style={{position: 'absolute', left: 783, top: 180, width: 14, height: 720, background: '#4A3226'}} />
        <div style={{position: 'absolute', left: 560, top: 520, width: 460, height: 14, background: '#4A3226'}} />
        {/* kệ cốc bên trái */}
        {[360, 560].map((y) => (
          <React.Fragment key={y}>
            <div style={{position: 'absolute', left: 40, top: y, width: 420, height: 18, background: '#7A5134'}} />
            {[70, 160, 250, 340].map((x, i) => (
              <div
                key={x}
                style={{
                  position: 'absolute',
                  left: x,
                  top: y - 70,
                  width: 64,
                  height: 70,
                  borderRadius: '8px 8px 18px 18px',
                  background: ['#F2E6D8', '#E9A55B', '#7FB7C9', '#F2E6D8'][i],
                }}
              />
            ))}
          </React.Fragment>
        ))}
        <Pendant x={300} len={170} />
        <Pendant x={760} len={110} />
        <Plant x={-40} y={760} s={1.2} />
        <Plant x={860} y={900} s={1} />
        {/* quầy gỗ phía sau nhân vật */}
        <div style={{position: 'absolute', left: 0, right: 0, top: 1290, height: 700, background: 'linear-gradient(180deg, #8A5A3A 0%, #6B4429 12%, #4A2F1E 100%)'}} />
        {BOKEH.map((b, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: b.x - b.r + Math.sin(frame / 60 + i) * 12,
              top: b.y - b.r + Math.cos(frame / 75 + i) * 10,
              width: b.r * 2,
              height: b.r * 2,
              borderRadius: '50%',
              background: b.c,
              opacity: 0.55,
            }}
          />
        ))}
      </AbsoluteFill>
      {/* phủ tối phần trên cho chữ của card dễ đọc, nhạt dần xuống chỗ nhân vật */}
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(14,18,32,0.72) 0%, rgba(14,18,32,0.55) 38%, rgba(14,18,32,0.15) 62%, rgba(14,18,32,0.35) 100%)'}} />
    </AbsoluteFill>
  );
};
