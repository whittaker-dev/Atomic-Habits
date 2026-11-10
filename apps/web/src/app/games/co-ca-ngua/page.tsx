import type { Metadata, Viewport } from 'next';
import { CoCaNgua } from '@/games/co-ca-ngua/co-ca-ngua';

export const metadata: Metadata = {
  title: 'Cờ cá ngựa — Games',
  description:
    'Cờ cá ngựa 3D cho 2–4 người: ra quân, đá ngựa, về chuồng. Chơi chung máy, với máy hoặc qua phòng online.',
};

// Chặn zoom bằng hai ngón để chạm vào bàn cờ không làm phóng to trang.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function CoCaNguaPage() {
  return <CoCaNgua />;
}
