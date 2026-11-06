import type { Metadata, Viewport } from 'next';
import { SonLanhDia } from '@/games/son-lanh-dia/son-lanh-dia';

export const metadata: Metadata = {
  title: 'Sơn Lãnh Địa — Games',
  description: 'Party game sơn sàn: chạy, bắn bóng sơn, phe phủ nhiều sàn nhất sau 2 phút thắng.',
};

// Chặn zoom bằng hai ngón để bấm nút ảo trong trận không làm phóng to trang.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function SonLanhDiaPage() {
  return <SonLanhDia />;
}
