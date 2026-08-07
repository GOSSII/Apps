import {
  darkColors, legacySubjectColours, lightColors, palettes, subjectPalette, type Colors
} from '../theme';
import { migrateSubjectColours } from '../lib/storage';

/* The palettes are the one part of this app whose correctness is a number, so
   it is asserted rather than eyeballed. Every check here has failed at least
   once during the dark-mode work — the first subject blue missed 3:1 on the
   dark chip by half a point, which is invisible in a screenshot and obvious
   here. */

const channel = (c: number) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255)
    + 0.7152 * channel((n >> 8) & 255)
    + 0.0722 * channel(n & 255);
}

function contrast(a: string, b: string): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** Every opaque ground a subject colour can land on, across both themes. */
const GROUNDS: [string, string][] = [
  ['light.bg', lightColors.bg],
  ['light.surface', lightColors.surface],
  ['light.surface2', lightColors.surface2],
  ['light.surface3', lightColors.surface3],
  ['dark.bg', darkColors.bg],
  ['dark.surface', darkColors.surface],
  ['dark.surface2', darkColors.surface2],
  ['dark.surface3', darkColors.surface3]
];

describe('contrast', () => {
  it('sanity-checks itself against the two known extremes', () => {
    expect(contrast('#FFFFFF', '#000000')).toBeCloseTo(21, 1);
    expect(contrast('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
  });

  it.each(['light', 'dark'] as const)('%s reads at AA on every surface it uses', name => {
    const c: Colors = palettes[name];
    for (const ground of [c.bg, c.surface, c.surface2, c.surface3, c.accentSoft]) {
      expect(contrast(c.text, ground)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.muted, ground)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.accentText, ground)).toBeGreaterThanOrEqual(4.5);
      // State colours are words, not decoration — they carry the same bar.
      expect(contrast(c.good, ground)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.warn, ground)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.danger, ground)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(['light', 'dark'] as const)('%s carries a white button label', name => {
    // Every primary Button is white text on the accent.
    expect(contrast('#FFFFFF', palettes[name].accent)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(['light', 'dark'] as const)('%s separates a card from its ground', name => {
    const c = palettes[name];
    expect(c.surface).not.toBe(c.bg);
  });
});

describe('subject colours', () => {
  /* A subject's colour is written onto it when it is created, so it cannot
     follow the theme — one value has to work on both grounds. 3:1 is the bar
     for a graphical object such as a dot or a bar. */
  it.each(subjectPalette)('%s clears 3:1 on every ground it can land on', colour => {
    for (const [where, ground] of GROUNDS) {
      const ratio = contrast(colour, ground);
      if (ratio < 3) throw new Error(`${colour} is ${ratio.toFixed(2)}:1 on ${where}`);
    }
  });

  it('is distinguishable — no two entries are the same colour', () => {
    expect(new Set(subjectPalette).size).toBe(subjectPalette.length);
  });

  it('retires every old colour into the current palette', () => {
    for (const [from, to] of Object.entries(legacySubjectColours)) {
      expect(subjectPalette).toContain(to);
      expect(from).not.toBe(to);
    }
  });

  it('does not list a current colour as something to migrate away from', () => {
    // Otherwise a subject would be rewritten on every single load.
    for (const current of subjectPalette) {
      expect(legacySubjectColours[current]).toBeUndefined();
    }
  });
});

describe('migrateSubjectColours', () => {
  it('rewrites a subject that predates the dark ground', () => {
    const out = migrateSubjectColours([{ id: 's1', name: 'Physics', color: '#3552CC' }]);
    expect(out[0].color).toBe(legacySubjectColours['#3552CC']);
    expect(out[0].name).toBe('Physics');
  });

  it('leaves a colour it does not recognise alone', () => {
    // It may well be deliberate; guessing at it would be worse than leaving it.
    const out = migrateSubjectColours([{ id: 's1', name: 'Physics', color: '#123456' }]);
    expect(out[0].color).toBe('#123456');
  });

  it('is idempotent', () => {
    const once = migrateSubjectColours([{ id: 's1', name: 'P', color: '#7c5cff' }]);
    expect(migrateSubjectColours(once)).toEqual(once);
  });
});
