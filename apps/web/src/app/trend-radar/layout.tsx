import type { Viewport } from 'next';
import type { ReactNode } from 'react';
import { TrendRadarShell } from '@/components/trend-radar/shell';
import { loadTrendRadar } from '@/lib/trend-radar/sources';

// Phải là số viết thẳng (Next đọc tĩnh), giữ bằng REFRESH_SECONDS trong sources.ts.
// Đặt ở layout nên áp dụng cho mọi trang con của /trend-radar.
export const revalidate = 900;

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default async function TrendRadarLayout({ children }: { children: ReactNode }) {
  const data = await loadTrendRadar();
  return <TrendRadarShell data={data}>{children}</TrendRadarShell>;
}
