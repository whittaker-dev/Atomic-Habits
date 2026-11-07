import type { Metadata, Viewport } from 'next';
import { VeDoan } from '@/games/ve-doan/ve-doan';

export const metadata: Metadata = {
  title: 'Vẽ Đoán — Games',
  description: 'Party game vẽ đoán: một người vẽ, cả phòng đoán, ai đoán ra nhanh được nhiều điểm.',
};

// Chặn zoom bằng hai ngón để vẽ trên bảng không làm phóng to trang.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function VeDoanPage() {
  return <VeDoan />;
}
