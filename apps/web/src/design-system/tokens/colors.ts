/**
 * Spotify accent · dark canvas.
 * Component structure: see /DESIGN.md
 */
export const colors = {
  primary: '#1ed760',
  primaryHover: '#1db954',
  primaryFocus: '#169c46',
  onPrimary: '#000000',

  canvas: '#121212',
  surface1: '#181818',
  surface2: '#1f1f1f',
  surface3: '#252525',
  surface4: '#272727',

  hairline: '#333333',
  hairlineStrong: '#4d4d4d',
  hairlineTertiary: '#2a2a2a',

  inverseCanvas: '#eeeeee',
  inverseSurface1: '#ffffff',
  inverseSurface2: '#f5f5f5',
  inverseInk: '#121212',

  ink: '#ffffff',
  inkMuted: '#cbcbcb',
  inkSubtle: '#b3b3b3',
  inkTertiary: '#7c7c7c',

  semanticSuccess: '#1ed760',
  semanticWarning: '#ffa42b',
  semanticError: '#f3727f',
  semanticInfo: '#539df5',
  semanticOverlay: 'rgba(0, 0, 0, 0.72)',
} as const;

export type ColorToken = keyof typeof colors;

export type CardTint = 'surface-1' | 'surface-2' | 'surface-3' | 'surface-4';
