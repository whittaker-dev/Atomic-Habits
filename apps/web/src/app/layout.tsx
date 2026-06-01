import type { Metadata } from 'next';
import { fontMono, fontSans } from '@/design-system/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Atomic Habits — Personal Growth OS',
  description: 'Daily missions, streaks, and visible progress for self-improvement.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fontSans.variable} ${fontMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
