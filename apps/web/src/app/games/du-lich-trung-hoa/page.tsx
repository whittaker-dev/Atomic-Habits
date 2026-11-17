import type { Metadata, Viewport } from 'next';
import { DuLichTrungHoa } from '@/games/du-lich-trung-hoa/du-lich-trung-hoa';

export const metadata: Metadata = {
  title: 'Du lịch Trung Hoa — Games',
  description:
    'Học tiếng Trung bằng một chuyến tàu qua tám thành phố Trung Quốc: nghe từ và câu khi hỏi đường, gọi món, mua sắm rồi gõ lại bằng pinyin, mỗi ga được đóng một con dấu son.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function DuLichTrungHoaPage() {
  return <DuLichTrungHoa />;
}
