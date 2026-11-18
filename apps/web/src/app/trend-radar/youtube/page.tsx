import type { Metadata } from 'next';
import { YouTubePage } from '@/components/trend-radar/pages';

export const metadata: Metadata = {
  title: 'YouTube thịnh hành — TrendRadar VN',
  description: 'Video phổ biến nhất trên YouTube tại Việt Nam.',
};

export default function Page() {
  return <YouTubePage />;
}
