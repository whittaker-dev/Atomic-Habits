import type { Metadata } from 'next';
import { I18nProvider } from '@/components/i18n-provider';
import { SWRProvider } from '@/components/swr-provider';
import { inter, jetbrainsMono } from '@/design-system/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Atomic Habits — Personal Growth OS',
  description: 'Daily missions, streaks, and visible progress for self-improvement.',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <SWRProvider>
          <I18nProvider>{children}</I18nProvider>
        </SWRProvider>
      </body>
    </html>
  );
}
