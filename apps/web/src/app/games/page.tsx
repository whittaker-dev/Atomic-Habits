import type { Metadata } from 'next';
import { GamesHome } from '@/components/games/games-home';

export const metadata: Metadata = {
  title: 'Games — Atomic Habits',
  description: 'Browser games that run instantly, with progress saved on your device.',
};

export default function GamesPage() {
  return <GamesHome />;
}
