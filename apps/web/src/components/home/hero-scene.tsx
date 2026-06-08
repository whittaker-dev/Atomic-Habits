'use client';

import { Float, MeshDistortMaterial, Sphere, Stars } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useRef } from 'react';
import type { Mesh } from 'three';

const PRIMARY = '#1ed760';
const ACCENT = '#539df5';

function FloatingOrb({
  position,
  color,
  scale,
  speed = 2,
}: {
  position: [number, number, number];
  color: string;
  scale: number;
  speed?: number;
}) {
  return (
    <Float speed={speed} rotationIntensity={0.35} floatIntensity={1.2}>
      <Sphere args={[1, 48, 48]} position={position} scale={scale}>
        <MeshDistortMaterial
          color={color}
          distort={0.35}
          speed={1.8}
          roughness={0.15}
          metalness={0.85}
          emissive={color}
          emissiveIntensity={0.15}
        />
      </Sphere>
    </Float>
  );
}

function OrbitRing() {
  const ref = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.x += delta * 0.12;
      ref.current.rotation.y += delta * 0.18;
    }
  });

  return (
    <mesh ref={ref} rotation={[Math.PI / 3, 0, 0]}>
      <torusGeometry args={[3.2, 0.03, 16, 100]} />
      <meshBasicMaterial color={PRIMARY} transparent opacity={0.35} />
    </mesh>
  );
}

function SceneContent() {
  return (
    <>
      <ambientLight intensity={0.25} />
      <pointLight position={[8, 6, 6]} intensity={1.4} color={PRIMARY} />
      <pointLight position={[-6, -4, 4]} intensity={0.6} color={ACCENT} />
      <Stars radius={80} depth={40} count={1200} factor={3} saturation={0} fade speed={0.8} />
      <OrbitRing />
      <FloatingOrb position={[-2.8, 0.8, -0.5]} color={PRIMARY} scale={1.15} />
      <FloatingOrb position={[3.2, -0.4, -1.2]} color={ACCENT} scale={0.85} speed={2.5} />
      <FloatingOrb position={[0.4, -1.8, 0.8]} color="#1db954" scale={0.55} speed={1.6} />
    </>
  );
}

export function HeroScene() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-b from-canvas/20 via-canvas/70 to-canvas" />
      <Canvas
        className="!absolute inset-0 h-full w-full"
        camera={{ position: [0, 0, 9], fov: 42 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  );
}
