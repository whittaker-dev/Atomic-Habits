import { DM_Sans, JetBrains_Mono } from 'next/font/google';

/** SpotifyMixUI substitute */
export const fontSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

/** Linear Mono substitute — code in product screenshots */
export const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const fonts = [fontSans, fontMono];

/** @deprecated use fontSans */
export const fontDisplay = fontSans;
/** @deprecated use fontSans */
export const fontBody = fontSans;
