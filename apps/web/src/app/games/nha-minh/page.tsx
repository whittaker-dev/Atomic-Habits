import type { Metadata, Viewport } from 'next';
import { NhaMinh } from '@/games/nha-minh/nha-minh';

export const metadata: Metadata = {
  title: 'Nhà Mình — Games',
  description: 'Hai người, một quỹ tiền, cùng xây một căn nhà gia đình.',
};

// Chặn trình duyệt phóng to cả trang khi chụm hai ngón: cử chỉ đó dành cho phóng to cảnh 3D.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function NhaMinhPage() {
  return <NhaMinh />;
}
