// Zanqa design tokens (from zanqa-ds/styles.css in the Yallo design project).
import { Platform } from 'react-native';

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

export const radius = { sm: 8, md: 14, lg: 20, pill: 999 } as const;

export const shadow = {
  sm: '0px 1px 2px rgba(75, 40, 20, 0.06), 0px 2px 8px rgba(75, 40, 20, 0.05)',
  md: '0px 4px 14px rgba(75, 40, 20, 0.10)',
  lg: '0px 16px 40px rgba(75, 40, 20, 0.18)',
  accent: '0px 6px 16px rgba(207, 69, 32, 0.30)',
} as const;

/** Photo placeholder — swap for real photography. */
export const photoPlaceholder = `radial-gradient(120% 90% at 20% 10%, ${colors.accent100}, transparent 60%), radial-gradient(90% 80% at 90% 100%, ${colors.saffron100}, transparent 60%)`;

export const monoFont = Platform.select({ ios: 'Menlo', default: 'monospace' });

export type Weight = 400 | 500 | 600 | 700;

const families = {
  heading: { 400: 'Outfit_500Medium', 500: 'Outfit_500Medium', 600: 'Outfit_600SemiBold', 700: 'Outfit_700Bold' },
  body: { 400: 'Figtree_400Regular', 500: 'Figtree_500Medium', 600: 'Figtree_600SemiBold', 700: 'Figtree_700Bold' },
  arabic: {
    400: 'IBMPlexSansArabic_400Regular',
    500: 'IBMPlexSansArabic_500Medium',
    600: 'IBMPlexSansArabic_600SemiBold',
    700: 'IBMPlexSansArabic_700Bold',
  },
} as const;

/** Outfit and Figtree have no Arabic glyphs, so Arabic UI uses IBM Plex Sans Arabic throughout. */
export function fontFamily(kind: 'heading' | 'body', weight: Weight, arabic: boolean) {
  return families[arabic ? 'arabic' : kind][weight];
}
