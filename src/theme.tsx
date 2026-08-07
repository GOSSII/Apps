import React, { createContext, useContext } from 'react';
import { Platform, useColorScheme, type ViewStyle } from 'react-native';
import type { ThemePref } from './types';

/* Two palettes, one shape. Light is the default and is the design the app was
   asked for: a lavender ground, white cards, royal indigo. Dark exists because
   this app is opened at 1am at least as often as at 6am, and a page of white
   at that hour is the reason people put the phone down.

   Every value is checked against the ground it actually sits on rather than
   picked by eye — the numbers in the comments are computed, and the subject
   palette has a test that fails if a future edit drops one below the bar. */

export type ThemeName = 'light' | 'dark';

export const lightColors = {
  /** Page ground: white with a lavender cast, so white cards lift off it. */
  bg: '#F1F3FC',
  /** Cards and sheets. */
  surface: '#FFFFFF',
  /** Track fills, unselected chips, empty chart bars. */
  surface2: '#E8EBF8',
  /** A chip or row that has to read as lifted *above* surface2. */
  surface3: '#FFFFFF',
  line: '#DFE3F3',
  /** 13.7:1 on the ground, 12.5:1 on the deepest tint it ever sits on. */
  text: '#16205A',
  /** The floor for body text. 5.3:1 on the ground; 4.8:1 on a tinted chip,
   *  which is the case that actually decides the value. */
  muted: '#5C6489',
  /** Behind white button labels (6.5:1) and as the dial fill. */
  accent: '#3552CC',
  /** The accent used AS text. On light the same value clears 5.9:1. */
  accentText: '#3552CC',
  accentSoft: '#E4E9FC',
  /** The dial's second gradient stop — decorative, so no text bar applies. */
  accentGlow: '#6C8BFF',
  /** The two middle bands of the calendar heatmap. */
  heatLow: 'rgba(53, 82, 204, 0.22)',
  heatMid: 'rgba(53, 82, 204, 0.55)',
  /** Behind a modal sheet. */
  scrim: 'rgba(22, 32, 90, 0.32)',
  /* State colours are words, so they carry the 4.5:1 text bar too — each
     of these is set by the tinted chip, not by the white card. */
  good: '#127538',
  warn: '#AE3F28',
  danger: '#C81E1E'
};

export type Colors = typeof lightColors;

/* Dark is not the light palette inverted. Ground and card are near-black with
   a blue cast; separation comes from the card being *lighter* than the ground,
   because a shadow on a dark ground is invisible. On the ground: text 16.7:1,
   muted 7.3:1, accentText 8.2:1; the worst case for each is the lifted chip,
   and even there nothing drops below 4.8:1. */
export const darkColors: Colors = {
  bg: '#0F1115',
  surface: '#171A21',
  surface2: '#1F2430',
  surface3: '#252B38',
  line: '#272D3A',
  text: '#EEF1F6',
  muted: '#98A1B2',
  /* A blue that holds white at 4.6:1. Lifting it further would start losing
     the white label it exists to carry. */
  accent: '#4E6BE8',
  /* That fill cannot also be read as text on this ground, so the text variant
     is a separate, lighter value. */
  accentText: '#8FA6FF',
  accentSoft: '#1E2748',
  accentGlow: '#8FA6FF',
  heatLow: 'rgba(78, 107, 232, 0.30)',
  heatMid: 'rgba(78, 107, 232, 0.62)',
  /* Deeper than light's scrim: a translucent indigo over a near-black ground
     would not read as "the sheet is in front" at all. */
  scrim: 'rgba(0, 0, 0, 0.62)',
  good: '#34D371',
  warn: '#F2AB34',
  danger: '#FF6B6B'
};

export const palettes: Record<ThemeName, Colors> = {
  light: lightColors,
  dark: darkColors
};

/* On light a card is separated by lift; on dark by its own surface being
   lighter than the ground — a shadow there would be invisible anyway. */
export const shadowFor = (theme: ThemeName): ViewStyle =>
  theme === 'dark'
    ? {}
    : (Platform.select({
        android: { elevation: 2 },
        default: {
          shadowColor: '#243069',
          shadowOpacity: 0.08,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 }
        }
      }) as ViewStyle);

/* Subject colours are written onto the subject when it is created, so unlike
   everything else here they cannot follow the theme — one value has to work on
   both. Each clears 3:1 on every ground it can land on: the light ground, a
   white card, a light chip, and all three dark surfaces. The band satisfying
   all six is narrow, which is why these are mid-tones rather than the brighter
   set either palette would pick on its own. */
export const subjectPalette = [
  '#5B78E0', '#1F8F84', '#D2553A', '#B07500',
  '#9163E6', '#2B9450', '#C9457C', '#2A7FC4'
];

/** Colours from before subjects had to survive both grounds, and what they
 *  become. Applied on load, because a subject created last week would
 *  otherwise be left as a dot nobody can see on the dark ground. */
export const legacySubjectColours: Record<string, string> = {
  // The light-only palette.
  '#3552CC': '#5B78E0',
  '#12897E': '#1F8F84',
  '#A66A00': '#B07500',
  '#7A4FD0': '#9163E6',
  '#15803D': '#2B9450',
  '#C0407A': '#C9457C',
  '#1D6FB8': '#2A7FC4',
  // The first palette, before the reskin.
  '#7c5cff': '#9163E6',
  '#22c55e': '#2B9450',
  '#f59e0b': '#B07500',
  '#06b6d4': '#2A7FC4',
  '#ec4899': '#C9457C',
  '#ef4444': '#D2553A',
  '#84cc16': '#2B9450',
  '#eab308': '#B07500'
};

export const radius = { sm: 10, md: 14, lg: 20, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

/* ---- the live theme ------------------------------------------------------

   The preference lives in app state (so it is backed up and restored with
   everything else); resolving it against the OS setting happens here. The
   provider takes the preference as a prop rather than reading the store, which
   keeps this file free of a cycle — the store imports subjectPalette from it. */

const ThemeContext = createContext<ThemeName>('light');

export function ThemeProvider({ pref, children }: {
  pref: ThemePref;
  children: React.ReactNode;
}) {
  const system = useColorScheme();
  const theme: ThemeName = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export const useTheme = (): ThemeName => useContext(ThemeContext);

export const useColors = (): Colors => palettes[useTheme()];

/** Wraps a stylesheet factory into a hook that returns the sheet for whichever
 *  theme is live. Both sheets are built at most once each and then cached, so
 *  a re-render costs a map lookup — the same as a module-scope StyleSheet. */
export function themed<T>(factory: (colors: Colors, shadow: ViewStyle) => T): () => T {
  const cache: Partial<Record<ThemeName, T>> = {};
  return function useStyles(): T {
    const theme = useTheme();
    let sheet = cache[theme];
    if (!sheet) {
      sheet = factory(palettes[theme], shadowFor(theme));
      cache[theme] = sheet;
    }
    return sheet;
  };
}
