import type { Metadata } from 'next';
import { GamePage } from '@/components/trend-radar/pages';

export const metadata: Metadata = {
  title: 'Game — TrendRadar VN',
  description:
    'Tin game mới nhất, tin Valorant và Liên Minh Huyền Thoại, video game thịnh hành trên YouTube tại Việt Nam.',
};

export default function Page() {
  return <GamePage />;
}
