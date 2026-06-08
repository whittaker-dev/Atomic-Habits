'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const DEFAULT_FIREWORK_COLORS = ['#1ed760', '#ffa42b', '#539df5', '#ffffff', '#ffe08a', '#1db954'];

type FireworkParticle = {
  id: string;
  angle: number;
  distance: number;
  delay: number;
  color: string;
  size: number;
  drift: number;
};

export type FireworkBurstConfig = {
  id: string;
  left: string;
  top: string;
  delay: number;
  ringSize: number;
  particles: FireworkParticle[];
};

export function buildFireworkBurst(
  id: string,
  left: string,
  top: string,
  delay: number,
  count: number,
  distance: number,
  ringSize: number,
  colors: string[] = DEFAULT_FIREWORK_COLORS,
): FireworkBurstConfig {
  return {
    id,
    left,
    top,
    delay,
    ringSize,
    particles: Array.from({ length: count }, (_, index) => ({
      id: `${id}-p-${index}`,
      angle: (360 / count) * index,
      distance,
      delay: delay + index * 0.012,
      color: colors[index % colors.length] ?? colors[0] ?? '#1ed760',
      size: index % 4 === 0 ? 6 : index % 2 === 0 ? 5 : 4,
      drift: 12 + (index % 5) * 6,
    })),
  };
}

function FireworkParticleDot({ particle }: { particle: FireworkParticle }) {
  const rad = (particle.angle * Math.PI) / 180;
  const targetX = Math.cos(rad) * particle.distance;
  const targetY = Math.sin(rad) * particle.distance + particle.drift;

  return (
    <motion.span
      className="absolute left-0 top-0 rounded-full"
      style={{
        width: particle.size,
        height: particle.size,
        backgroundColor: particle.color,
        boxShadow: `0 0 14px ${particle.color}`,
      }}
      initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        x: [0, targetX * 0.55, targetX],
        y: [0, targetY * 0.45, targetY],
        scale: [0, 1.4, 0.6],
      }}
      transition={{
        duration: 1.35,
        delay: particle.delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    />
  );
}

function FireworkBurstView({ burst }: { burst: FireworkBurstConfig }) {
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: burst.left, top: burst.top }}
    >
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
        style={{ width: 10, height: 10 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 5, 0], opacity: [0, 0.95, 0] }}
        transition={{ duration: 0.55, delay: burst.delay, ease: [0.22, 1, 0.36, 1] }}
      />

      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary/70"
        initial={{ width: 0, height: 0, opacity: 0 }}
        animate={{
          width: [0, burst.ringSize],
          height: [0, burst.ringSize],
          opacity: [0.85, 0],
        }}
        transition={{ duration: 0.9, delay: burst.delay + 0.05, ease: 'easeOut' }}
      />

      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-2xl"
        initial={{ width: 0, height: 0, opacity: 0 }}
        animate={{
          width: [0, burst.ringSize * 0.75],
          height: [0, burst.ringSize * 0.75],
          opacity: [0.7, 0],
        }}
        transition={{ duration: 1.1, delay: burst.delay, ease: 'easeOut' }}
      />

      {burst.particles.map((particle) => (
        <FireworkParticleDot key={particle.id} particle={particle} />
      ))}
    </div>
  );
}

export function Fireworks({
  bursts,
  className,
}: {
  bursts: FireworkBurstConfig[];
  className?: string;
}) {
  return (
    <div
      className={cn('pointer-events-none absolute -inset-20 overflow-visible', className)}
      aria-hidden
    >
      {bursts.map((burst) => (
        <FireworkBurstView key={burst.id} burst={burst} />
      ))}
    </div>
  );
}
