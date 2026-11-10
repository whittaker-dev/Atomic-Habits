import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import type {ThreeElements} from '@react-three/fiber';
import {interpolate} from 'remotion';
import {clamp} from '../theme';
import {Speaker, TimedLine} from '../english/timeline';
import {lineAt, mouthOpen, rng, VoxelLine, VoxelTimeline} from './data';

// Toạ độ 3D (đơn vị ~ mét): sàn ở y=0, nhân vật cao ~2,7, mặt quay về +z (phía máy quay)
const X: Record<Speaker, number> = {com: -1.05, mia: 1.05};
const HEAD_Y = 1.6; // đáy đầu (đỉnh cổ)
const HEAD_CENTER = HEAD_Y + 0.48;

type V3 = [number, number, number];
// `flat`: chi tiết nhỏ trên mặt (mắt, kính, lông mày) không đổ bóng, tránh vệt bóng nhoè lên mặt
type BoxProps = {p: V3; s: V3; c: string; r?: V3; metal?: number; rough?: number; flat?: boolean} & Omit<ThreeElements['mesh'], 'position' | 'rotation'>;

/** Mọi thứ trên nhân vật đều là hộp — không có lưới mềm nên không méo/biến dạng giữa các cảnh */
const Box: React.FC<BoxProps> = ({p, s, c, r, metal = 0, rough = 0.75, flat = false, ...rest}) => (
  <mesh position={p} rotation={r} castShadow={!flat} receiveShadow={!flat} {...rest}>
    <boxGeometry args={s} />
    <meshStandardMaterial color={c} metalness={metal} roughness={rough} />
  </mesh>
);

type Look = {skin: string; shirt: string; pants: string; hair: string};
const LOOKS: Record<Speaker, Look> = {
  com: {skin: '#E9B88E', shirt: '#1C1C22', pants: '#2E3448', hair: '#141418'},
  mia: {skin: '#F3C9A6', shirt: '#F4F4F1', pants: '#7D9CC9', hair: '#6B4128'},
};

type Mood = 'serious' | 'happy' | undefined;

type Pose = {
  open: number; // miệng mở 0..1
  blink: number; // 0 mở mắt, 1 nhắm
  headYaw: number;
  bob: number; // nhún khi nói
  armL: number; // góc giơ tay (rad), 0 = buông
  armR: number;
  mood: Mood;
  breathe: number;
};

const Eye: React.FC<{x: number; blink: number; mood: Mood; serious: 'brows' | 'bars'}> = ({x, blink, mood, serious}) => {
  const z = 0.49;
  if (mood === 'happy') {
    // Mắt ^ ^
    return (
      <group position={[x, 0.5, z]}>
        <Box p={[-0.04, 0, 0]} s={[0.11, 0.04, 0.03]} r={[0, 0, 0.7]} c="#15151A" flat />
        <Box p={[0.04, 0, 0]} s={[0.11, 0.04, 0.03]} r={[0, 0, -0.7]} c="#15151A" flat />
      </group>
    );
  }
  // Mia nghiêm túc thì mắt thành hai vạch | |
  const bars = mood === 'serious' && serious === 'bars';
  const w = bars ? 0.07 : 0.15;
  const h = (bars ? 0.21 : 0.17) * (1 - 0.9 * blink);
  return (
    <group position={[x, 0.5, z]}>
      <Box p={[0, 0, 0]} s={[w, h, 0.04]} c="#15151A" flat />
      {blink < 0.5 && !bars ? <Box p={[0.035, 0.045, 0.025]} s={[0.05, 0.05, 0.01]} c="#FFFFFF" rough={0.3} flat /> : null}
    </group>
  );
};

const Mouth: React.FC<{open: number; mood: Mood}> = ({open, mood}) => {
  const z = 0.49;
  if (open < 0.06 && mood === 'happy') {
    return (
      <group position={[0, 0.24, z]}>
        <Box p={[0, -0.02, 0]} s={[0.2, 0.04, 0.03]} c="#4A1820" flat />
        <Box p={[-0.12, 0.01, 0]} s={[0.06, 0.04, 0.03]} c="#4A1820" flat />
        <Box p={[0.12, 0.01, 0]} s={[0.06, 0.04, 0.03]} c="#4A1820" flat />
      </group>
    );
  }
  const h = 0.035 + 0.15 * open;
  return (
    <group position={[0, 0.24, z]}>
      <Box p={[0, 0, 0]} s={[0.22 + 0.04 * open, h, 0.03]} c="#4A1820" flat />
      {open > 0.35 ? <Box p={[0, -h / 2 + 0.025, 0.006]} s={[0.12, 0.035, 0.03]} c="#E0667A" flat /> : null}
    </group>
  );
};

const Arm: React.FC<{side: 1 | -1; angle: number; look: Look; watch?: boolean}> = ({side, angle, look, watch}) => (
  <group position={[side * 0.56, 1.46, 0]} rotation={[0, 0, side * angle]}>
    <Box p={[0, -0.13, 0]} s={[0.27, 0.3, 0.3]} c={look.shirt} />
    <Box p={[0, -0.5, 0]} s={[0.22, 0.5, 0.24]} c={look.skin} />
    <Box p={[0, -0.81, 0]} s={[0.25, 0.16, 0.27]} c={look.skin} />
    {watch ? (
      <>
        <Box p={[0, -0.67, 0]} s={[0.26, 0.09, 0.28]} c="#1E1E24" rough={0.4} />
        <Box p={[0, -0.67, 0.145]} s={[0.12, 0.08, 0.02]} c="#C9CED6" metal={0.8} rough={0.25} />
      </>
    ) : null}
  </group>
);

const ComHair: React.FC<{c: string}> = ({c}) => (
  <>
    <Box p={[0, 0.99, 0]} s={[1.1, 0.2, 1.02]} c={c} />
    <Box p={[0, 0.62, -0.47]} s={[1.1, 0.78, 0.1]} c={c} />
    <Box p={[-0.53, 0.78, -0.02]} s={[0.08, 0.42, 0.92]} c={c} />
    <Box p={[0.53, 0.78, -0.02]} s={[0.08, 0.42, 0.92]} c={c} />
    {/* Mái lởm chởm */}
    <Box p={[-0.3, 0.86, 0.49]} s={[0.4, 0.15, 0.07]} r={[0, 0, 0.08]} c={c} />
    <Box p={[0.06, 0.88, 0.5]} s={[0.36, 0.13, 0.07]} r={[0, 0, -0.1]} c={c} />
    <Box p={[0.36, 0.86, 0.49]} s={[0.32, 0.15, 0.07]} r={[0, 0, 0.12]} c={c} />
  </>
);

/** Kính gọng đen: mỗi tròng là 4 thanh + cầu kính + 2 càng */
const Glasses: React.FC = () => {
  const c = '#0E0E12';
  const z = 0.52;
  const lens = (x: number) => (
    <group key={x} position={[x, 0.52, z]}>
      <Box p={[0, 0.13, 0]} s={[0.32, 0.045, 0.03]} c={c} rough={0.35} flat />
      <Box p={[0, -0.13, 0]} s={[0.32, 0.045, 0.03]} c={c} rough={0.35} flat />
      <Box p={[-0.14, 0, 0]} s={[0.045, 0.26, 0.03]} c={c} rough={0.35} flat />
      <Box p={[0.14, 0, 0]} s={[0.045, 0.26, 0.03]} c={c} rough={0.35} flat />
    </group>
  );
  return (
    <>
      {lens(-0.2)}
      {lens(0.2)}
      <Box p={[0, 0.56, z]} s={[0.1, 0.04, 0.03]} c={c} flat />
      <Box p={[-0.53, 0.58, 0.25]} s={[0.04, 0.04, 0.52]} c={c} />
      <Box p={[0.53, 0.58, 0.25]} s={[0.04, 0.04, 0.52]} c={c} />
    </>
  );
};

const MiaHair: React.FC<{c: string}> = ({c}) => (
  <>
    <Box p={[0, 0.99, 0]} s={[1.1, 0.2, 1.04]} c={c} />
    <Box p={[0, 0.55, -0.48]} s={[1.1, 0.9, 0.1]} c={c} />
    <Box p={[-0.54, 0.6, 0.06]} s={[0.1, 0.72, 0.62]} c={c} />
    <Box p={[0.54, 0.6, 0.06]} s={[0.1, 0.72, 0.62]} c={c} />
    <Box p={[-0.2, 0.87, 0.5]} s={[0.62, 0.14, 0.07]} r={[0, 0, -0.06]} c={c} />
    <Box p={[0.32, 0.86, 0.5]} s={[0.4, 0.14, 0.07]} r={[0, 0, 0.1]} c={c} />
    {/* Búi tóc rối */}
    <Box p={[0.05, 1.24, -0.12]} s={[0.44, 0.38, 0.44]} r={[0.2, 0.45, 0.15]} c={c} />
    <Box p={[0.24, 1.36, -0.02]} s={[0.18, 0.16, 0.18]} r={[0.5, 0.2, 0.6]} c={c} />
    <Box p={[-0.16, 1.38, -0.24]} s={[0.16, 0.18, 0.16]} r={[0.3, 0.8, -0.4]} c={c} />
    <Box p={[0.1, 1.45, -0.18]} s={[0.06, 0.2, 0.06]} r={[0.2, 0, -0.5]} c={c} />
  </>
);

const Character: React.FC<{who: Speaker; pose: Pose}> = ({who, pose}) => {
  const look = LOOKS[who];
  const brow = (side: 1 | -1) => {
    const rz = pose.mood === 'serious' ? side * 0.3 : pose.mood === 'happy' ? -side * 0.12 : 0;
    const y = 0.69 + (pose.mood === 'happy' ? 0.05 : 0) + 0.025 * pose.open;
    return <Box key={side} p={[side * 0.2, y, 0.5]} s={[0.25, 0.065, 0.05]} r={[0, 0, rz]} c={look.hair} flat />;
  };
  // Nhún + co giãn nhẹ khi nói (Mia nhún nhiều hơn)
  const squash = (who === 'mia' ? 0.07 : 0.04) * pose.bob;
  return (
    <group position={[X[who], squash * 0.6, 0]} scale={[1 + squash * 0.25, 1 - squash * 0.15 + 0.012 * pose.breathe, 1 + squash * 0.25]}>
      <Box p={[-0.2, 0.4, 0]} s={[0.32, 0.62, 0.36]} c={look.pants} />
      <Box p={[0.2, 0.4, 0]} s={[0.32, 0.62, 0.36]} c={look.pants} />
      <Box p={[-0.2, 0.07, 0.04]} s={[0.35, 0.14, 0.46]} c="#F1F1F1" />
      <Box p={[0.2, 0.07, 0.04]} s={[0.35, 0.14, 0.46]} c="#F1F1F1" />
      <Box p={[0, 1.12, 0]} s={[0.86, 0.82, 0.48]} c={look.shirt} />
      <Box p={[0, 1.57, 0]} s={[0.3, 0.1, 0.3]} c={look.skin} />
      <Arm side={-1} angle={pose.armL} look={look} />
      <Arm side={1} angle={pose.armR} look={look} watch={who === 'com'} />
      <group position={[0, HEAD_Y, 0]} rotation={[0, pose.headYaw, 0]}>
        <Box p={[0, 0.48, 0]} s={[1.04, 0.96, 0.96]} c={look.skin} />
        <Eye x={-0.2} blink={pose.blink} mood={pose.mood} serious={who === 'mia' ? 'bars' : 'brows'} />
        <Eye x={0.2} blink={pose.blink} mood={pose.mood} serious={who === 'mia' ? 'bars' : 'brows'} />
        {brow(-1)}
        {brow(1)}
        <Mouth open={pose.open} mood={pose.mood} />
        {who === 'com' ? (
          <>
            <ComHair c={look.hair} />
            <Glasses />
          </>
        ) : (
          <>
            <MiaHair c={look.hair} />
            <Box p={[-0.33, 0.3, 0.485]} s={[0.13, 0.05, 0.02]} c="#F29AA6" flat />
            <Box p={[0.33, 0.3, 0.485]} s={[0.13, 0.05, 0.02]} c="#F29AA6" flat />
            {/* Khuyên tai bạc */}
            <Box p={[-0.6, 0.24, 0.1]} s={[0.07, 0.12, 0.07]} c="#D8DDE6" metal={0.9} rough={0.2} />
            <Box p={[0.6, 0.24, 0.1]} s={[0.07, 0.12, 0.07]} c="#D8DDE6" metal={0.9} rough={0.2} />
          </>
        )}
      </group>
    </group>
  );
};

/** Tư thế của 1 nhân vật tại khung hình `frame` — chỉ phụ thuộc frame nên render lại ra y hệt */
function poseFor(who: Speaker, timeline: VoxelTimeline, frame: number, fps: number): Pose {
  const t = frame / fps;
  const {line, prev} = lineAt(timeline, frame);
  const speaking = line && line.speaker === who && frame < line.from + line.dur ? line : null;
  const open = speaking ? mouthOpen(speaking, frame, fps) : 0;

  // Chớp mắt theo chu kỳ riêng cho mỗi người để không chớp cùng lúc
  const period = who === 'com' ? 3.3 : 2.9;
  const ph = (t + (who === 'com' ? 0.7 : 0)) % period;
  const blink = ph < 0.14 ? Math.sin((Math.PI * ph) / 0.14) : 0;

  // Người nghe quay đầu về phía người nói; đổi hướng mượt trong 8 khung
  const yawFor = (l: TimedLine | null) => (!l || l.speaker === who ? 0 : who === 'com' ? 0.42 : -0.42);
  const k = line ? interpolate(frame - line.from, [0, 8], [0, 1], clamp) : 1;
  const headYaw = yawFor(prev) * (1 - k) + yawFor(line) * k + 0.03 * Math.sin(t * 1.3 + (who === 'com' ? 0 : 2));

  const mood = (line as VoxelLine | null)?.mood;
  const idle = 0.12 + 0.03 * Math.sin(t * 2 + (who === 'com' ? 0 : 1.5));
  let armL = idle;
  let armR = idle;
  if (speaking) {
    const lt = (frame - speaking.from) / fps;
    const up = interpolate(frame - speaking.from, [0, 6], [0, 1], clamp);
    if (mood === 'happy') {
      // Giơ hai tay ăn mừng
      armL = idle + up * (2.3 + 0.25 * Math.sin(lt * 9));
      armR = idle + up * (2.3 + 0.25 * Math.sin(lt * 9 + 1));
    } else if (/^Step /.test(speaking.say)) {
      // "Step one…" — giơ cao một tay
      armR = idle + up * 2.55;
    } else {
      // Tay vung theo nhịp nói
      armR = idle + up * (0.55 + 0.35 * Math.sin(lt * 6)) * (0.6 + 0.4 * open);
    }
  } else if (mood === 'happy') {
    armL = idle + 0.5 + 0.15 * Math.sin(t * 8);
    armR = idle + 0.5 + 0.15 * Math.sin(t * 8 + 1);
  }
  return {open, blink, headYaw, bob: open, armL, armR, mood, breathe: Math.sin(t * 2 + (who === 'com' ? 0 : 1))};
}

export type Shot = {pos: V3; target: V3};

/** Cắt cảnh theo từng câu: cận mặt người nói hoặc toàn cảnh 2 người, máy đẩy chậm vào trong mỗi cảnh */
function shotAt(timeline: VoxelTimeline, frame: number): Shot {
  const lines = timeline.lines;
  let i = lines.findIndex((l, n) => frame < (lines[n + 1]?.from ?? Infinity) - 2);
  if (i < 0) i = lines.length - 1;
  const l = lines[i];
  const start = i === 0 ? 0 : l.from - 2;
  const end = (lines[i + 1]?.from ?? timeline.total) - 2;
  const p = interpolate(frame, [start, end], [0, 1], clamp);
  const side = i % 2 ? 1 : -1;
  if (l.shot === 'close') {
    const x = X[l.speaker];
    // Khung dọc hẹp: lùi đủ xa để cả đầu (kể cả búi tóc của Mia) nằm gọn, còn chừa chỗ quanh đầu
    const d = 6.4 - 0.45 * p;
    return {pos: [x + side * 0.9 - x * 0.2, HEAD_CENTER + 0.1, d], target: [x, HEAD_CENTER + 0.18, 0]};
  }
  const d = 10.6 - 0.6 * p;
  return {pos: [side * 0.7, 2.3, d], target: [0, 1.75, 0]};
}

const CameraRig: React.FC<{shot: Shot}> = ({shot}) => {
  const camera = useThree((s) => s.camera);
  // Đặt máy ngay khi render (trước khi canvas vẽ khung này), không dùng useFrame
  camera.position.set(...shot.pos);
  camera.lookAt(...shot.target);
  return null;
};

/** Đốm sáng nhoè phía sau (bokeh) — vị trí cố định theo seed */
const Bokeh: React.FC<{frame: number}> = ({frame}) => {
  const texture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.45, 'rgba(255,255,255,0.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }, []);
  const dots = useMemo(() => {
    const r = rng(7);
    const colors = ['#7B5CFF', '#FF5CA8', '#3DD6FF', '#FFD60A', '#5B8CFF'];
    return Array.from({length: 46}, () => ({
      x: -13 + 26 * r(),
      y: 0.8 + 9 * r(),
      z: -19 + 12 * r(),
      s: 0.5 + 1.6 * r(),
      o: 0.18 + 0.4 * r(),
      c: colors[Math.floor(r() * colors.length)],
      ph: r() * 6.28,
    }));
  }, []);
  const t = frame / 30;
  return (
    <>
      {dots.map((d, i) => (
        <sprite key={i} position={[d.x + 0.15 * Math.sin(t * 0.4 + d.ph), d.y + 0.2 * Math.sin(t * 0.3 + d.ph), d.z]} scale={[d.s, d.s, 1]}>
          <spriteMaterial map={texture} color={d.c} transparent opacity={d.o * (0.8 + 0.2 * Math.sin(t * 1.1 + d.ph))} depthWrite={false} fog={false} />
        </sprite>
      ))}
    </>
  );
};

/** `shot` thay máy quay theo câu (dùng cho ảnh bìa) */
export const World: React.FC<{timeline: VoxelTimeline; frame: number; fps: number; shot?: Shot}> = ({timeline, frame, fps, shot}) => {
  const grid = useMemo(() => {
    const g = new THREE.GridHelper(60, 60, '#8A7BFF', '#3A4BC8');
    const m = g.material as THREE.LineBasicMaterial;
    m.transparent = true;
    m.opacity = 0.55;
    return g;
  }, []);
  return (
    <>
      <color attach="background" args={['#0A0F2C']} />
      <fog attach="fog" args={['#0A0F2C', 13, 32]} />
      <CameraRig shot={shot ?? shotAt(timeline, frame)} />

      <ambientLight intensity={0.45} color="#8C98FF" />
      <hemisphereLight args={['#A9B6FF', '#1A1030', 0.5]} />
      <directionalLight
        position={[4, 7, 6]}
        intensity={2.6}
        color="#FFD7AE"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-bias={-0.0004}
        shadow-radius={5}
      />
      <directionalLight position={[-3, 4, -6]} intensity={3.2} color="#A46BFF" />
      <directionalLight position={[3, 3, -5]} intensity={1.4} color="#5CC8FF" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#121A44" roughness={0.85} />
      </mesh>
      <primitive object={grid} position={[0, 0.004, 0]} />
      {/* Bục tròn phát sáng dưới chân 2 nhân vật */}
      <mesh position={[0, 0.04, 0]} receiveShadow>
        <cylinderGeometry args={[2.9, 2.9, 0.08, 64]} />
        <meshStandardMaterial color="#1B2462" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.085, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.78, 2.9, 64]} />
        <meshBasicMaterial color="#9B7BFF" toneMapped={false} />
      </mesh>
      <Bokeh frame={frame} />

      <group position={[0, 0.08, 0]}>
        <Character who="com" pose={poseFor('com', timeline, frame, fps)} />
        <Character who="mia" pose={poseFor('mia', timeline, frame, fps)} />
      </group>
    </>
  );
};
