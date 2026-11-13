import type { Metadata, Viewport } from 'next';
import { BanBi } from '@/games/ban-bi/ban-bi';

export const metadata: Metadata = {
  title: 'Bắn Bi Bá Khí — Games',
  description:
    'Bắn bi ba màu là nổ, phá càng lẹ võ sĩ càng nạp khí qua sáu cấp biến hình. Phá sạch bàn nhanh nhất để lên bảng xếp hạng.',
};

// Chặn zoom bằng hai ngón để kéo ngắm trên bàn bi không làm phóng to trang.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function BanBiPage() {
  return <BanBi />;
}
