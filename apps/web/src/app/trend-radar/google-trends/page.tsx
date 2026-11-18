import type { Metadata } from 'next';
import { TrendsPage } from '@/components/trend-radar/pages';

export const metadata: Metadata = {
  title: 'Google Trends Việt Nam — TrendRadar VN',
  description: 'Từ khoá đang được tìm nhiều nhất trên Google tại Việt Nam và tin liên quan.',
};

export default function Page() {
  return <TrendsPage />;
}
