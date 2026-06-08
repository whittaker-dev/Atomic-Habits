import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--color-canvas)',
        surface: {
          1: 'var(--color-surface-1)',
          2: 'var(--color-surface-2)',
          3: 'var(--color-surface-3)',
          4: 'var(--color-surface-4)',
        },
        hairline: {
          DEFAULT: 'var(--color-hairline)',
          strong: 'var(--color-hairline-strong)',
          tertiary: 'var(--color-hairline-tertiary)',
        },
        inverse: {
          canvas: 'var(--color-inverse-canvas)',
          'surface-1': 'var(--color-inverse-surface-1)',
          'surface-2': 'var(--color-inverse-surface-2)',
          ink: 'var(--color-inverse-ink)',
        },
        ink: {
          DEFAULT: 'var(--color-ink)',
          muted: 'var(--color-ink-muted)',
          subtle: 'var(--color-ink-subtle)',
          tertiary: 'var(--color-ink-tertiary)',
        },
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          focus: 'var(--color-primary-focus)',
          foreground: 'var(--color-on-primary)',
        },
        'on-primary': 'var(--color-on-primary)',
        success: 'var(--color-semantic-success)',
        warning: 'var(--color-semantic-warning)',
        error: 'var(--color-semantic-error)',
        info: 'var(--color-semantic-info)',
        overlay: 'var(--color-semantic-overlay)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        border: 'var(--border)',
        ring: 'var(--ring)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'display-xl': [
          'var(--text-display-xl)',
          { lineHeight: '1.05', fontWeight: '700', letterSpacing: 'var(--tracking-display-xl)' },
        ],
        'display-lg': [
          'var(--text-display-lg)',
          { lineHeight: '1.1', fontWeight: '700', letterSpacing: 'var(--tracking-display-lg)' },
        ],
        'display-md': [
          'var(--text-display-md)',
          { lineHeight: '1.15', fontWeight: '700', letterSpacing: 'var(--tracking-display-md)' },
        ],
        headline: [
          'var(--text-headline)',
          { lineHeight: '1.2', fontWeight: '700', letterSpacing: 'var(--tracking-headline)' },
        ],
        'card-title': [
          'var(--text-card-title)',
          { lineHeight: '1.25', fontWeight: '700', letterSpacing: 'var(--tracking-card-title)' },
        ],
        subhead: [
          'var(--text-subhead)',
          { lineHeight: '1.4', fontWeight: '400', letterSpacing: '-0.2px' },
        ],
        'body-lg': ['var(--text-body-lg)', { lineHeight: '1.5', letterSpacing: '-0.1px' }],
        body: ['var(--text-body)', { lineHeight: '1.5', letterSpacing: 'var(--tracking-body)' }],
        'body-sm': ['var(--text-body-sm)', { lineHeight: '1.5' }],
        caption: ['var(--text-caption)', { lineHeight: '1.4' }],
        button: ['var(--text-button)', { lineHeight: '1.2', fontWeight: '500' }],
        eyebrow: [
          'var(--text-eyebrow)',
          { lineHeight: '1.3', fontWeight: '500', letterSpacing: 'var(--tracking-eyebrow)' },
        ],
        mono: ['var(--text-mono)', { lineHeight: '1.5' }],
        /* Legacy aliases */
        'heading-1': [
          'var(--text-heading-1)',
          { lineHeight: '1.05', fontWeight: '700', letterSpacing: '-3px' },
        ],
        'heading-2': [
          'var(--text-heading-2)',
          { lineHeight: '1.1', fontWeight: '700', letterSpacing: '-1.8px' },
        ],
        'heading-3': [
          'var(--text-heading-3)',
          { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.6px' },
        ],
        'heading-4': [
          'var(--text-heading-4)',
          { lineHeight: '1.25', fontWeight: '700', letterSpacing: '-0.4px' },
        ],
        subtitle: ['var(--text-subtitle)', { lineHeight: '1.5', letterSpacing: '-0.1px' }],
        'body-md': ['var(--text-body-md)', { lineHeight: '1.5', letterSpacing: '-0.05px' }],
        'button-md': ['var(--text-button)', { lineHeight: '1.2', fontWeight: '500' }],
      },
      spacing: {
        xxs: 'var(--spacing-xxs)',
        xs: 'var(--spacing-xs)',
        sm: 'var(--spacing-sm)',
        md: 'var(--spacing-md)',
        lg: 'var(--spacing-lg)',
        xl: 'var(--spacing-xl)',
        xxl: 'var(--spacing-xxl)',
        section: 'var(--spacing-section)',
        'section-lg': 'var(--spacing-section-lg)',
        hero: 'var(--spacing-hero)',
      },
      borderRadius: {
        xs: 'var(--rounded-xs)',
        sm: 'var(--rounded-sm)',
        md: 'var(--rounded-md)',
        lg: 'var(--rounded-lg)',
        xl: 'var(--rounded-xl)',
        xxl: 'var(--rounded-xxl)',
        pill: 'var(--rounded-pill)',
        full: 'var(--rounded-full)',
      },
      maxWidth: {
        content: 'var(--max-width)',
      },
      height: {
        nav: 'var(--nav-height)',
      },
      boxShadow: {
        panel: 'var(--panel-edge)',
      },
    },
  },
  plugins: [],
};

export default config;
