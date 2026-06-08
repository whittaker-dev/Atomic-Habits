import { Inter, JetBrains_Mono } from 'next/font/google';

export const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-sans',
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-mono',
});

export const fontSans = inter;
export const fontMono = jetbrainsMono;

export const fonts = [inter, jetbrainsMono];

/** @deprecated use inter */
export const fontDisplay = inter;
/** @deprecated use inter */
export const fontBody = inter;
/** @deprecated use jetbrainsMono */
export const jetBrainsMono = jetbrainsMono;
