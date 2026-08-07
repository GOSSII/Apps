import { Platform, type ViewStyle } from 'react-native';

/* Light, on a lavender ground with white cards and a royal indigo accent —
   the palette Flipd uses, and the one this app was asked for.

   Every value here was checked against WCAG AA on the ground it actually sits
   on, not picked by eye: text 13.7:1, muted 4.6:1, accent 5.9:1 as text and
   6.5:1 behind white button labels. That is why the accent is a touch deeper
   than the reference — the reference puts its blue on white at display sizes,
   where the bar is lower. */

export const colors = {
  /** Page ground: white with a lavender cast, so white cards lift off it. */
  bg: '#F1F3FC',
  /** Cards and sheets. */
  surface: '#FFFFFF',
  /** Track fills, unselected chips, empty chart bars. */
  surface2: '#E8EBF8',
  line: '#DFE3F3',
  text: '#16205A',
  muted: '#646C93',
  /** One accent now: at 5.9:1 on the ground it works as text and as a fill. */
  accent: '#3552CC',
  accentText: '#3552CC',
  accentSoft: '#E4E9FC',
  /** State only, never decoration. */
  good: '#15803D',
  warn: '#B8442C',
  danger: '#C81E1E'
};

/* On a light ground a card is separated by lift, not by a border — but a
   hairline still carries the edge on Android, where elevation alone is faint
   at this contrast. */
export const cardShadow: ViewStyle = Platform.select({
  ios: {
    shadowColor: '#243069',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 }
  },
  android: { elevation: 2 },
  default: {
    shadowColor: '#243069',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 }
  }
}) as ViewStyle;

/* Distinguishable as 10px dots and as chart bars, and each at least 4:1 on
   white so a colour-blind reader still has the label beside it. */
export const subjectPalette = [
  '#3552CC', '#12897E', '#D2553A', '#A66A00',
  '#7A4FD0', '#15803D', '#C0407A', '#1D6FB8'
];

export const radius = { sm: 10, md: 14, lg: 20, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
