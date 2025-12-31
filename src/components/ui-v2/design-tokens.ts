/**
 * Kitia Design System v2 - Design Tokens
 *
 * A refined, minimalist design system focused on clarity and user experience.
 * Uses a carefully curated palette with intentional restraint.
 */

export const tokens = {
  // Color palette - warm neutrals with a distinctive accent
  colors: {
    // Primary - a refined slate-charcoal that feels premium
    primary: {
      50: '#f8f9fa',
      100: '#f1f3f5',
      200: '#e9ecef',
      300: '#dee2e6',
      400: '#ced4da',
      500: '#adb5bd',
      600: '#868e96',
      700: '#495057',
      800: '#343a40',
      900: '#212529',
      950: '#0d0f10',
    },
    // Accent - a warm terracotta/rust that feels human, not corporate
    accent: {
      50: '#fef6f3',
      100: '#fde8e1',
      200: '#fcd5c8',
      300: '#f8b4a0',
      400: '#f28b6d',
      500: '#e8683f', // Main accent
      600: '#d4532e',
      700: '#b04325',
      800: '#913923',
      900: '#773322',
    },
    // Semantic
    success: '#2d8a5e',
    warning: '#c4841d',
    error: '#c53030',
    info: '#2b6cb0',
  },

  // Spacing scale - 4px base with intentional gaps
  spacing: {
    px: '1px',
    0: '0',
    1: '0.25rem', // 4px
    2: '0.5rem', // 8px
    3: '0.75rem', // 12px
    4: '1rem', // 16px
    5: '1.25rem', // 20px
    6: '1.5rem', // 24px
    8: '2rem', // 32px
    10: '2.5rem', // 40px
    12: '3rem', // 48px
    16: '4rem', // 64px
    20: '5rem', // 80px
    24: '6rem', // 96px
  },

  // Typography - refined sizing with intentional rhythm
  typography: {
    fontSize: {
      xs: '0.75rem', // 12px
      sm: '0.875rem', // 14px
      base: '1rem', // 16px
      lg: '1.125rem', // 18px
      xl: '1.25rem', // 20px
      '2xl': '1.5rem', // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
    },
    lineHeight: {
      tight: '1.25',
      snug: '1.375',
      normal: '1.5',
      relaxed: '1.625',
      loose: '1.75',
    },
    letterSpacing: {
      tighter: '-0.02em',
      tight: '-0.01em',
      normal: '0',
      wide: '0.01em',
      wider: '0.02em',
    },
  },

  // Border radius - geometric and intentional
  radius: {
    none: '0',
    sm: '0.25rem', // 4px - for small elements
    md: '0.5rem', // 8px - for medium elements
    lg: '0.75rem', // 12px - for large elements
    xl: '1rem', // 16px - for cards
    full: '9999px', // Pills
  },

  // Shadows - subtle and refined
  shadow: {
    none: 'none',
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.04)',
    md: '0 2px 4px -1px rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
    lg: '0 4px 6px -2px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
    xl: '0 8px 16px -4px rgb(0 0 0 / 0.08), 0 4px 6px -2px rgb(0 0 0 / 0.04)',
  },

  // Transitions - smooth but not sluggish
  transition: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// CSS custom properties for runtime theming
export const cssVariables = `
  :root {
    /* Colors */
    --color-background: ${tokens.colors.primary[50]};
    --color-surface: #ffffff;
    --color-surface-elevated: #ffffff;
    --color-text-primary: ${tokens.colors.primary[900]};
    --color-text-secondary: ${tokens.colors.primary[600]};
    --color-text-muted: ${tokens.colors.primary[500]};
    --color-border: ${tokens.colors.primary[200]};
    --color-border-subtle: ${tokens.colors.primary[100]};
    --color-accent: ${tokens.colors.accent[500]};
    --color-accent-hover: ${tokens.colors.accent[600]};
    --color-accent-light: ${tokens.colors.accent[50]};

    /* Semantic */
    --color-success: ${tokens.colors.success};
    --color-warning: ${tokens.colors.warning};
    --color-error: ${tokens.colors.error};
    --color-info: ${tokens.colors.info};

    /* Spacing */
    --space-1: ${tokens.spacing[1]};
    --space-2: ${tokens.spacing[2]};
    --space-3: ${tokens.spacing[3]};
    --space-4: ${tokens.spacing[4]};
    --space-5: ${tokens.spacing[5]};
    --space-6: ${tokens.spacing[6]};
    --space-8: ${tokens.spacing[8]};

    /* Radius */
    --radius-sm: ${tokens.radius.sm};
    --radius-md: ${tokens.radius.md};
    --radius-lg: ${tokens.radius.lg};
    --radius-xl: ${tokens.radius.xl};

    /* Shadows */
    --shadow-sm: ${tokens.shadow.sm};
    --shadow-md: ${tokens.shadow.md};
    --shadow-lg: ${tokens.shadow.lg};

    /* Transitions */
    --transition-fast: ${tokens.transition.fast};
    --transition-normal: ${tokens.transition.normal};
  }
`;

export default tokens;
