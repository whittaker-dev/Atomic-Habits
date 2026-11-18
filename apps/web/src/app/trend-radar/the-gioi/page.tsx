import type { Metadata } from 'next';
import { WorldPage } from '@/components/trend-radar/pages';

export const metadata: Metadata = {
  title: 'Tin thế giới — TrendRadar VN',
  description: 'Tin thế giới mới nhất trong ngày.',
};

export default function Page() {
  return <WorldPage />;
}
