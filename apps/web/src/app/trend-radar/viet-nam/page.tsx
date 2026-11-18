import type { Metadata } from 'next';
import { VietnamPage } from '@/components/trend-radar/pages';

export const metadata: Metadata = {
  title: 'Tin Việt Nam — TrendRadar VN',
  description: 'Tin Việt Nam mới nhất theo chuyên mục: xã hội, kinh tế, thể thao, công nghệ.',
};

export default function Page() {
  return <VietnamPage />;
}
