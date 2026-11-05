import React, { createContext, useContext } from 'react';
import { Platform, StyleSheet, useColorScheme, type TextStyle, type ViewStyle } from 'react-native';
import type { ThemePref } from './types';

/* Paper and ink.

   The palette this replaces was five hues — lavender ground, indigo, green,
   amber, red — and every screen reached for whichever one was handy. This one
   is a single neutral ramp plus a single accent, and the state colours are
   pulled toward the ramp rather than being three more hues competing with it.
   Colour is now information: if something on screen is coloured, it means
   something. The ground is warm rather than blue, because the app is read at
   6am and at 1am and a warm paper is easier to sit with than a lavender one.

   Every value is checked against the ground it actually sits on rather than
   picked by eye — the numbers in the comments are computed, and there is a
   test that fails if a future edit drops one below the bar. */

export type ThemeName = 'light' | 'dark';

export const lightColors = {
  /** Warm paper. White cards lift off it without needing a shadow. */
  bg: '#F5F4F0',
  /** Cards, sheets, the tab bar. */
  surface: '#FFFFFF',
  /** Track fills, unselected segments, empty chart bars, chips on a card. */
  surface2: '#EAE8E1',
  /** A chip or row that has to read as lifted *above* surface2. */
  surface3: '#FFFFFF',
  line: '#E1DED5',
  /** 16.4:1 on the ground. */
  text: '#1A1A17',
  /** The floor for body text. 5.6:1 on the ground; 4.9:1 on a tinted chip,
   *  which is the case that actually decides the value. */
  muted: '#63605A',
  /** Behind white button labels (8.6:1) and as the dial fill. */
  accent: '#145247',
  /** The accent used AS text. On light the same value clears 8.2:1. */
  accentText: '#145247',
  accentSoft: '#E2ECE8',
  /** The dial's second gradient stop — decorative, so no text bar applies. */
  accentGlow: '#3E9C86',
  /** The two middle bands of the calendar heatmap. */
  heatLow: 'rgba(20, 82, 71, 0.20)',
  heatMid: 'rgba(20, 82, 71, 0.52)',
  /** Behind a modal sheet. */
  scrim: 'rgba(26, 26, 23, 0.34)',
  /* State colours are words, so they carry the 4.5:1 text bar too — each of
     these is set by the tinted chip, not by the white card. */
  good: '#1C6B45',
  warn: '#8A4A16',
  danger: '#AE2B22'
};

export type Colors = typeof lightColors;

/* Dark is not the light palette inverted. Ground and card are near-black with
   the same warm cast; separation comes from the card being *lighter* than the
   ground, because a shadow on a dark ground is invisible. On the ground:
   text 17.2:1, muted 7.6:1, accentText 9.5:1; the worst case for each is the
   lifted chip, and even there nothing drops below 4.8:1. */
export const darkColors: Colors = {
  bg: '#111310',
  surface: '#1A1C19',
  surface2: '#232622',
  surface3: '#2C2F2B',
  line: '#2E322D',
  text: '#F1F1EC',
  muted: '#A09D95',
  /* A green that holds white at 5.0:1. Lifting it further would start losing
     the white label it exists to carry. */
  accent: '#2A7A65',
  /* That fill cannot also be read as text on this ground, so the text variant
     is a separate, lighter value. */
  accentText: '#6FCFB2',
  accentSoft: '#14302A',
  accentGlow: '#6FCFB2',
  heatLow: 'rgba(111, 207, 178, 0.22)',
  heatMid: 'rgba(111, 207, 178, 0.52)',
  /* Deeper than light's scrim: a translucent ink over a near-black ground
     would not read as "the sheet is in front" at all. */
  scrim: 'rgba(0, 0, 0, 0.64)',
  good: '#4FCC93',
  warn: '#E0A44E',
  danger: '#FF7B72'
};

export const palettes: Record<ThemeName, Colors> = {
  light: lightColors,
  dark: darkColors
};

/* Cards are separated by a hairline, not by lift — a page of drop shadows is
   the single loudest thing in the old design. The only two surfaces that
   genuinely float above the content are the tab bar and a modal sheet, and
   they are the only two that get this. */
export const floatShadow = (theme: ThemeName): ViewStyle =>
  Platform.select({
    android: { elevation: theme === 'dark' ? 0 : 8 },
    default: {
      shadowColor: theme === 'dark' ? '#000000' : '#2A2A20',
      shadowOpacity: theme === 'dark' ? 0.5 : 0.1,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 }
    }
  }) as ViewStyle;

/* Subject colours are written onto the subject when it is created, so unlike
   everything else here they cannot follow the theme — one value has to work on
   both. Each clears 3:1 on every ground it can land on: the light ground, a
   white card, a light chip, and all three dark surfaces. Six rather than the
   old eight: the pink and the cyan were a shade apart from the rust and the
   blue, and a list of subjects is easier to read when no two dots need a
   second look. */
export const subjectPalette = [
  '#5A78DA', '#2B8A7E', '#C4553C', '#A8781F', '#8B62D6', '#3E8F4E'
];

/** Colours from every earlier palette, and what they become. Applied on load,
 *  so a subject created last week is not left as a dot from a set the app no
 *  longer uses. */
export const legacySubjectColours: Record<string, string> = {
  // The dual-ground eight this set replaces.
  '#5B78E0': '#5A78DA',
  '#1F8F84': '#2B8A7E',
  '#D2553A': '#C4553C',
  '#B07500': '#A8781F',
  '#9163E6': '#8B62D6',
  '#2B9450': '#3E8F4E',
  '#C9457C': '#C4553C',
  '#2A7FC4': '#5A78DA',
  // The light-only palette before that.
  '#3552CC': '#5A78DA',
  '#12897E': '#2B8A7E',
  '#A66A00': '#A8781F',
  '#7A4FD0': '#8B62D6',
  '#15803D': '#3E8F4E',
  '#C0407A': '#C4553C',
  '#1D6FB8': '#5A78DA',
  // The first palette, before any of the reskins.
  '#7c5cff': '#8B62D6',
  '#22c55e': '#3E8F4E',
  '#f59e0b': '#A8781F',
  '#06b6d4': '#2B8A7E',
  '#ec4899': '#C4553C',
  '#ef4444': '#C4553C',
  '#84cc16': '#3E8F4E',
  '#eab308': '#A8781F'
};

/* Softer and larger than before. A 20px radius on a 44px chip reads as a
   rounded rectangle; the same radius on a full-width card reads as a corner
   someone forgot to finish. */
export const radius = { xs: 8, sm: 12, md: 16, lg: 22, xl: 28, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 36 };

/** The hairline React Native will actually draw, rather than a rounded 1px
 *  that lands as 1.5 on a 3x screen. */
export const hairline = StyleSheet.hairlineWidth;

/* One type scale, used everywhere, instead of every screen picking its own
   fontSize. The display sizes carry tabular figures because a clock that
   changes width as it counts down is the sort of thing you cannot un-see. */
const scale = <T extends Record<string, TextStyle>>(x: T): T => x;

export const type = scale({
  /** The dial, and nothing else. */
  display: { fontSize: 52, fontWeight: '700', letterSpacing: -2.2, fontVariant: ['tabular-nums'] },
  /** A screen's own name. */
  h1: { fontSize: 32, fontWeight: '700', letterSpacing: -1 },
  /** A number that leads a card. */
  h2: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  /** A row's subject. */
  title: { fontSize: 16, fontWeight: '600', letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  label: { fontSize: 13, fontWeight: '600' },
  caption: { fontSize: 12, fontWeight: '500', lineHeight: 17 },
  /** Section headings and anything else that is a label rather than a phrase. */
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase'
  },
  /** Any figure that sits next to another figure and has to line up. */
  numeric: { fontVariant: ['tabular-nums'] }
});

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
      sheet = factory(palettes[theme], floatShadow(theme));
      cache[theme] = sheet;
    }
    return sheet;
  };
}
