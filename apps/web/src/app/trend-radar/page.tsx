import type { Metadata } from 'next';
import { Overview } from '@/components/trend-radar/overview';

export const metadata: Metadata = {
  title: 'TrendRadar VN — Tin tức và xu hướng hôm nay',
  description:
    'Tin Việt Nam, tin thế giới, từ khoá được tìm nhiều trên Google và video YouTube thịnh hành tại Việt Nam, cập nhật mỗi 15 phút.',
};

export default function TrendRadarPage() {
  return <Overview />;
}
