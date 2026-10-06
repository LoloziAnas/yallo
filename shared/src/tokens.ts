// Zanqa design tokens as plain values, usable from React Native and the web alike.
// Names match the Expo apps' src/theme.ts; the web apps get the same values as CSS variables
// from zanqa.css (--color-accent-2-* there is `mint*` here).

export const colors = {
  bg: '#fbf6ef',
  surface: '#f3ebe1',
  card: '#ffffff',
  text: '#2b1d14',
  divider: 'rgba(43, 29, 20, 0.11)',

  // Paprika — the brand accent.
  accent: '#cf4520',
  accent100: '#fdefe8',
  accent200: '#fbdccd',
  accent300: '#f6bb9f',
  accent400: '#ee916a',
  accent500: '#e36a3f',
  accent600: '#cf4520',
  accent700: '#a9361a',
  accent800: '#7d2814',
  accent900: '#45170c',

  // Mint — savings, free delivery, success.
  mint: '#1f7a5a',
  mint100: '#e4f3ec',
  mint200: '#c3e5d5',
  mint300: '#93cfb3',
  mint500: '#2f9670',
  mint700: '#176247',
  mint900: '#0b3325',

  // Saffron — ratings and highlights.
  saffron: '#e7a321',
  saffron100: '#fdf3dc',

  neutral100: '#f8f3ed',
  neutral200: '#ede5db',
  neutral300: '#ddd2c5',
  neutral400: '#c0b3a4',
  neutral500: '#9e9184',
  neutral600: '#7c7064',
  neutral700: '#5f544a',
  neutral800: '#443a33',
  neutral900: '#2b231e',

  white: '#ffffff',
  scrim: 'rgba(43, 35, 30, 0.45)',
} as const;

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32 } as const;

export const radius = { sm: 8, md: 14, lg: 20, pill: 999 } as const;

export const shadow = {
  sm: '0px 1px 2px rgba(75, 40, 20, 0.06), 0px 2px 8px rgba(75, 40, 20, 0.05)',
  md: '0px 4px 14px rgba(75, 40, 20, 0.10)',
  lg: '0px 16px 40px rgba(75, 40, 20, 0.18)',
  accent: '0px 6px 16px rgba(207, 69, 32, 0.30)',
} as const;

/** Font families. Outfit and Figtree have no Arabic glyphs, so Arabic UI uses IBM Plex Sans Arabic. */
export const fonts = {
  heading: 'Outfit',
  body: 'Figtree',
  arabic: 'IBM Plex Sans Arabic',
} as const;
