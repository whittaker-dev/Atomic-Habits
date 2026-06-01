export const typography = {
  displayXl: { size: '80px', weight: 600, lineHeight: 1.05, letterSpacing: '-3px' },
  displayLg: { size: '56px', weight: 600, lineHeight: 1.1, letterSpacing: '-1.8px' },
  displayMd: { size: '40px', weight: 600, lineHeight: 1.15, letterSpacing: '-1px' },
  headline: { size: '28px', weight: 600, lineHeight: 1.2, letterSpacing: '-0.6px' },
  cardTitle: { size: '22px', weight: 500, lineHeight: 1.25, letterSpacing: '-0.4px' },
  subhead: { size: '20px', weight: 400, lineHeight: 1.4, letterSpacing: '-0.2px' },
  bodyLg: { size: '18px', weight: 400, lineHeight: 1.5, letterSpacing: '-0.1px' },
  body: { size: '16px', weight: 400, lineHeight: 1.5, letterSpacing: '-0.05px' },
  bodySm: { size: '14px', weight: 400, lineHeight: 1.5, letterSpacing: '0' },
  caption: { size: '12px', weight: 400, lineHeight: 1.4, letterSpacing: '0' },
  button: { size: '14px', weight: 500, lineHeight: 1.2, letterSpacing: '0' },
  eyebrow: { size: '13px', weight: 500, lineHeight: 1.3, letterSpacing: '0.4px' },
  mono: { size: '13px', weight: 400, lineHeight: 1.5, letterSpacing: '0' },
} as const;

export const fontFamily = {
  display:
    'var(--font-sans), "SF Pro Display", -apple-system, system-ui, "Segoe UI", Roboto, sans-serif',
  text: 'var(--font-sans), -apple-system, system-ui, "Segoe UI", Roboto, sans-serif',
  mono: 'var(--font-mono), ui-monospace, "SF Mono", Menlo, monospace',
} as const;
