import { createTheme, type MantineColorsTuple } from '@mantine/core';

const gold: MantineColorsTuple = [
  '#FFFBF0', // 0 – lightest
  '#FFF3CC',
  '#FFE799',
  '#FFCF33',
  '#E6B830',
  '#C9A84C', // 5 – primary
  '#B8960C',
  '#8A700A',
  '#5C4B07',
  '#2E2503', // 9 – darkest
];

const navy: MantineColorsTuple = [
  '#E8EDF5',
  '#C5D0E5',
  '#8BA1CA',
  '#5172AF',
  '#2A4D8F',
  '#1A3260',
  '#0D1B2A',
  '#0A1520',
  '#060E16',
  '#03070B',
];

export const mantineTheme = createTheme({
  // Typography
  fontFamily: "'Cairo', 'Inter', system-ui, sans-serif",
  fontFamilyMonospace: "'Courier New', monospace",

  // Palette
  primaryColor: 'gold',
  colors: { gold, navy },

  // Shape
  defaultRadius: 'md',
  radius: {
    xs: '6px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
  },

  // Spacing — matches Tailwind's scale roughly
  spacing: {
    xs: '8px',
    sm: '12px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },

  // Typography scale
  fontSizes: {
    xs:  '11px',
    sm:  '12px',
    md:  '14px',
    lg:  '16px',
    xl:  '18px',
  },

  // Line heights
  lineHeights: {
    xs:  '1.4',
    sm:  '1.5',
    md:  '1.55',
    lg:  '1.6',
    xl:  '1.65',
  },

  // Shadows — glass-style soft shadows
  shadows: {
    xs:  '0 2px 8px rgba(0,0,0,0.20)',
    sm:  '0 4px 16px rgba(0,0,0,0.25)',
    md:  '0 8px 32px rgba(0,0,0,0.28), 0 0 0 1px rgba(201,168,76,0.08)',
    lg:  '0 12px 48px rgba(0,0,0,0.35), 0 0 0 1px rgba(201,168,76,0.10)',
    xl:  '0 20px 60px rgba(0,0,0,0.45), 0 0 0 1px rgba(201,168,76,0.12)',
  },

  // Components — override defaults to match Glowmorphismus palette
  components: {
    Button: {
      styles: {
        root: {
          fontFamily: "'Cairo', 'Inter', system-ui, sans-serif",
          fontWeight: 600,
        },
      },
    },
    TextInput: {
      styles: {
        input: {
          background: 'rgba(255,255,255,0.07)',
          borderColor: 'rgba(201,168,76,0.18)',
          color: 'rgba(255,255,255,0.90)',
          backdropFilter: 'blur(12px)',
        },
      },
    },
    Select: {
      styles: {
        input: {
          background: 'rgba(255,255,255,0.07)',
          borderColor: 'rgba(201,168,76,0.18)',
          color: 'rgba(255,255,255,0.90)',
        },
        dropdown: {
          background: 'rgba(15,18,30,0.95)',
          backdropFilter: 'blur(24px)',
          borderColor: 'rgba(201,168,76,0.15)',
        },
      },
    },
    Modal: {
      styles: {
        content: {
          background: 'rgba(15,18,30,0.92)',
          backdropFilter: 'blur(32px)',
          border: '1px solid rgba(201,168,76,0.12)',
        },
        header: {
          background: 'transparent',
        },
      },
    },
    Table: {
      styles: {
        table: {
          background: 'transparent',
        },
        th: {
          color: 'rgba(255,255,255,0.45)',
          fontSize: '11px',
          fontWeight: 600,
          borderColor: 'rgba(255,255,255,0.06)',
        },
        td: {
          color: 'rgba(255,255,255,0.80)',
          borderColor: 'rgba(255,255,255,0.06)',
        },
      },
    },
    Notification: {
      styles: {
        root: {
          background: 'rgba(15,18,30,0.92)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(201,168,76,0.12)',
        },
      },
    },
    Tooltip: {
      styles: {
        tooltip: {
          background: 'rgba(15,18,30,0.95)',
          border: '1px solid rgba(255,255,255,0.10)',
          color: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(16px)',
        },
      },
    },
  },
});
