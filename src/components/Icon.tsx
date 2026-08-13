import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

/* Drawn icons rather than emoji.

   The old tab bar was ⏱ 📊 📚 ⚙️, which renders as four different artists'
   work at four different weights, in colour the app does not control, and
   differently on every Android skin. These are one stroke weight, one corner
   treatment, and they take the colour of whatever they sit in — which is what
   lets the tab bar tint them without a second asset.

   Paths are drawn on a 24-unit grid and scaled, so `size` is the only knob. */

export type IconName =
  | 'timer' | 'chart' | 'book' | 'settings'
  | 'chevronLeft' | 'chevronRight' | 'plus' | 'close'
  | 'play' | 'pause' | 'check' | 'bell' | 'flame' | 'target' | 'trash' | 'pencil';

type Props = {
  name: IconName;
  size?: number;
  color: string;
  /** Filled icons read as "on"; the same glyph outlined reads as "off". */
  strokeWidth?: number;
};

export function Icon({ name, size = 22, color, strokeWidth = 1.8 }: Props) {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none'
  };
  /* Hidden from screen readers, always. Every icon in this app sits next to
     the words it illustrates, or inside a control that carries its own label —
     so announcing it adds a second "image" to every row and says nothing the
     label did not. */
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      /* aria-hidden only: it is React Native's own alias for
         accessibilityElementsHidden and importantForAccessibility, and unlike
         those two it survives react-native-svg's web build, which forwards
         anything it does not recognise straight onto the DOM node. */
      aria-hidden
      pointerEvents="none"
    >
      {name === 'timer' && (
        <>
          <Circle cx={12} cy={13} r={8} {...common} />
          <Path d="M12 9.5V13l2.5 1.5" {...common} />
          <Path d="M9 2.5h6" {...common} />
        </>
      )}
      {name === 'chart' && (
        <>
          <Path d="M4 20V13" {...common} />
          <Path d="M10 20V6" {...common} />
          <Path d="M16 20v-9" {...common} />
          <Path d="M22 20H2" {...common} />
        </>
      )}
      {name === 'book' && (
        <>
          <Path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19v14H5.5A1.5 1.5 0 0 0 4 18.5z" {...common} />
          <Path d="M4 18.5A1.5 1.5 0 0 0 5.5 20H19v-3" {...common} />
          <Path d="M8.5 7.5h6" {...common} />
        </>
      )}
      {name === 'settings' && (
        <>
          <Circle cx={12} cy={12} r={3} {...common} />
          <Path
            d="M19.4 15a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-1 1.47V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.47 1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.6 1.6 0 0 0 4.6 15a1.6 1.6 0 0 0-1.47-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.47-1 1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.6 1.6 0 0 0 9 4.6 1.6 1.6 0 0 0 10 3.13V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.6 1.6 0 0 0 19.4 9v.1a1.6 1.6 0 0 0 1.47 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"
            {...common}
          />
        </>
      )}
      {name === 'chevronLeft' && <Path d="M15 5l-7 7 7 7" {...common} strokeWidth={2} />}
      {name === 'chevronRight' && <Path d="M9 5l7 7-7 7" {...common} strokeWidth={2} />}
      {name === 'plus' && (
        <>
          <Path d="M12 5v14" {...common} strokeWidth={2} />
          <Path d="M5 12h14" {...common} strokeWidth={2} />
        </>
      )}
      {name === 'close' && (
        <>
          <Path d="M6 6l12 12" {...common} strokeWidth={2} />
          <Path d="M18 6L6 18" {...common} strokeWidth={2} />
        </>
      )}
      {name === 'play' && <Path d="M7 4.5l12 7.5-12 7.5z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" fill={color} />}
      {name === 'pause' && (
        <>
          <Rect x={6} y={4.5} width={4} height={15} rx={1.4} fill={color} />
          <Rect x={14} y={4.5} width={4} height={15} rx={1.4} fill={color} />
        </>
      )}
      {name === 'check' && <Path d="M4.5 12.5l5 5 10-11" {...common} strokeWidth={2.2} />}
      {name === 'bell' && (
        <>
          <Path d="M18 9a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16S18 14 18 9z" {...common} />
          <Path d="M10.3 19.5a2 2 0 0 0 3.4 0" {...common} />
        </>
      )}
      {name === 'flame' && (
        <Path
          d="M12 2.5s5.5 4.2 5.5 9.2a5.5 5.5 0 1 1-11 0c0-1.9.8-3.3 1.7-4.5.3 1.3 1 2.2 1.9 2.2 1.5 0 1.2-2.6 1.9-6.9z"
          {...common}
        />
      )}
      {name === 'target' && (
        <>
          <Circle cx={12} cy={12} r={8.5} {...common} />
          <Circle cx={12} cy={12} r={4} {...common} />
          <Circle cx={12} cy={12} r={1} fill={color} stroke="none" />
        </>
      )}
      {name === 'trash' && (
        <>
          <Path d="M4 6.5h16" {...common} />
          <Path d="M8.5 6.5V4.8A1.3 1.3 0 0 1 9.8 3.5h4.4a1.3 1.3 0 0 1 1.3 1.3v1.7" {...common} />
          <Path d="M6.5 6.5l.9 12.2a1.6 1.6 0 0 0 1.6 1.5h6a1.6 1.6 0 0 0 1.6-1.5l.9-12.2" {...common} />
        </>
      )}
      {name === 'pencil' && (
        <>
          <Path d="M16.5 3.9a2 2 0 0 1 2.8 2.8L8.4 17.6 4 19l1.4-4.4z" {...common} />
          <Path d="M14.6 5.8l3.6 3.6" {...common} />
        </>
      )}
    </Svg>
  );
}
