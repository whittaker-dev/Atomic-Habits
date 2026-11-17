import type { Metadata, Viewport } from 'next';
import { EnglishTraveler } from '@/games/english-traveler/english-traveler';

export const metadata: Metadata = {
  title: 'English Traveler — Games',
  description:
    'Học tiếng Anh bằng một chuyến bay vòng quanh thế giới: nghe từ và câu ở sân bay, khách sạn, quán ăn rồi viết lại, mỗi chặng được đóng dấu hộ chiếu.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function EnglishTravelerPage() {
  return <EnglishTraveler />;
}
