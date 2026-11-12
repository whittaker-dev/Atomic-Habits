import type { Metadata, Viewport } from 'next';
import { CoTyPhu } from '@/games/co-ty-phu/co-ty-phu';

export const metadata: Metadata = {
  title: 'Cờ tỷ phú — Games',
  description:
    'Cờ tỷ phú 3D với địa danh Việt Nam cho 2–6 người: mua đất, xây nhà, đổi đất, đấu giá. Chơi chung máy, với máy hoặc qua phòng online.',
};

// Chặn zoom bằng hai ngón để chạm vào bàn cờ không làm phóng to trang.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function CoTyPhuPage() {
  return <CoTyPhu />;
}
