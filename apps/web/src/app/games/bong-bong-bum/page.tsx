import type { Metadata, Viewport } from 'next';
import { BongBongBum } from '@/games/bong-bong-bum/bong-bong-bum';

export const metadata: Metadata = {
  title: 'Bomb Arena — Games',
  description:
    'Party arena đặt bóng nổ trên lưới: đấu bot, 2 người cùng máy hoặc mời bạn qua link.',
};

// Chặn zoom bằng hai ngón để bấm nút ảo trong trận không làm phóng to trang.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function BongBongBumPage() {
  return <BongBongBum />;
}
