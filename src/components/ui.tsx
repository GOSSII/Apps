import React from 'react';
import {
  Pressable, StyleSheet, Text, View,
  type StyleProp, type TextStyle, type ViewStyle
} from 'react-native';
import { Icon, type IconName } from './Icon';
import { hairline, radius, space, themed, type, useColors } from '../theme';

/* The kit every screen is built from.

   Two rules hold the redesign together and both live here. Cards are separated
   by a hairline, never by a shadow — the only things that float are the tab bar
   and a sheet. And a choice between mutually exclusive options is a Segmented,
   not a row of chips: a row of pills gives no hint that picking one un-picks
   the others, which is exactly what the round-length and range rows were. */

export const SCREEN_PAD = 20;

export function Card({ children, style, flush }: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** For a card whose children draw their own padding, such as a list. */
  flush?: boolean;
}) {
  const styles = useStyles();
  return <View style={[styles.card, flush && styles.cardFlush, style]}>{children}</View>;
}

/** A screen's own name, with an optional something on the right of it. */
export function ScreenTitle({ children, right }: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  const styles = useStyles();
  return (
    <View style={styles.screenTitleRow}>
      <Text style={styles.screenTitle}>{children}</Text>
      {right}
    </View>
  );
}

export function SectionTitle({ children, style }: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  const styles = useStyles();
  return <Text style={[styles.sectionTitle, style]}>{children}</Text>;
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  /** primary — the one thing to do. ghost — an alternative. quiet — an escape
   *  hatch that should not compete. danger — destructive. */
  variant?: 'primary' | 'ghost' | 'quiet' | 'danger';
  size?: 'md' | 'sm';
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Button({
  label, onPress, variant = 'primary', size = 'md', icon, disabled, style, testID
}: ButtonProps) {
  const styles = useStyles();
  const colors = useColors();
  const tint = variant === 'primary' ? '#FFFFFF'
    : variant === 'danger' ? colors.danger
    : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.btn,
        size === 'sm' && styles.btnSm,
        variant === 'primary' && styles.btnPrimary,
        variant === 'ghost' && styles.btnGhost,
        variant === 'quiet' && styles.btnQuiet,
        variant === 'danger' && styles.btnDanger,
        (pressed || disabled) && styles.btnDim,
        style
      ]}
    >
      {!!icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} color={tint} />}
      <Text
        style={[
          styles.btnLabel,
          size === 'sm' && styles.btnLabelSm,
          { color: tint }
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** A tap target that is only an icon — back arrows, close buttons, row
 *  actions. Always 44 square however small the glyph is. */
export function IconButton({ name, onPress, label, tone = 'muted', testID }: {
  name: IconName;
  onPress: () => void;
  /** Never rendered; this is the only thing a screen reader gets. */
  label: string;
  tone?: 'muted' | 'text' | 'danger';
  testID?: string;
}) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.iconBtn, pressed && styles.btnDim]}
    >
      <Icon name={name} size={19} color={colors[tone === 'text' ? 'text' : tone]} />
    </Pressable>
  );
}

export type Option<T extends string | number> = { value: T; label: string; testID?: string };

/** One choice out of a few. The selected option is a raised pill inside a
 *  sunken track, which is the shape people already read as "one of these". */
export function Segmented<T extends string | number>({ options, value, onChange, style }: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  return (
    <View style={[styles.segTrack, style]} accessibilityRole="radiogroup">
      {options.map(option => {
        const on = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => onChange(option.value)}
            testID={option.testID}
            accessibilityRole="radio"
            accessibilityState={{ selected: on, checked: on }}
            aria-checked={on}
            style={({ pressed }) => [
              styles.seg,
              on && styles.segOn,
              pressed && !on && styles.btnDim
            ]}
          >
            <Text style={[styles.segLabel, on && styles.segLabelOn]} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Many choices, any number of them on — quick-add subjects, languages. */
export function Chip({ label, onPress, selected, testID }: {
  label: string;
  onPress: () => void;
  selected?: boolean;
  testID?: string;
}) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      aria-pressed={!!selected}
      style={({ pressed }) => [styles.chip, selected && styles.chipOn, pressed && styles.btnDim]}
    >
      {selected && <Icon name="check" size={13} color={colors.accentText} strokeWidth={2.6} />}
      <Text style={[styles.chipLabel, selected && styles.chipLabelOn]}>{label}</Text>
    </Pressable>
  );
}

/** One figure and what it is. The building block of every summary on Stats. */
export function Stat({ label, value, tone, testID, style }: {
  label: string;
  value: string;
  tone?: 'good' | 'muted';
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <View style={[styles.stat, style]}>
      <Text
        style={[styles.statValue, tone === 'good' && { color: colors.good }]}
        testID={testID}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/** Stats laid out as tiles rather than columns inside one card: three numbers
 *  sharing a card have to share its width, so the longest one sets the size of
 *  all three and "2h 30m" ends up smaller than "7". */
export function StatGrid({ children }: { children: React.ReactNode }) {
  const styles = useStyles();
  return <View style={styles.grid}>{children}</View>;
}

export function Tile({ children, style, onPress, testID }: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  testID?: string;
}) {
  const styles = useStyles();
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        testID={testID}
        accessibilityRole="button"
        style={({ pressed }) => [styles.card, styles.tile, pressed && styles.btnDim, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, styles.tile, style]}>{children}</View>;
}

/** A row in a grouped list: a label, an optional value, an optional chevron.
 *  Settings is nothing but these now. */
export function Row({
  title, subtitle, value, onPress, left, right, first, testID, accessibilityLabel
}: {
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  /** Something that identifies the row — a subject's colour, typically. It
   *  leads, because a marker parked after the text it belongs to is read as
   *  belonging to whatever comes next. */
  left?: React.ReactNode;
  right?: React.ReactNode;
  /** Divider above every row but the first. */
  first?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}) {
  const styles = useStyles();
  const colors = useColors();
  const body = (
    <>
      {left}
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
      </View>
      {!!value && <Text style={styles.rowValue}>{value}</Text>}
      {right}
      {!!onPress && !right && <Icon name="chevronRight" size={16} color={colors.muted} />}
    </>
  );
  if (!onPress) {
    return <View style={[styles.row, !first && styles.rowDivider]}>{body}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.row, !first && styles.rowDivider, pressed && styles.btnDim]}
    >
      {body}
    </Pressable>
  );
}

export function ProgressBar({ value, color, height = 8 }: {
  /** 0..1, clamped. */
  value: number;
  /** Defaults to the accent, which is theme-dependent — hence not a default
   *  parameter, which would be evaluated against whichever palette was
   *  imported first. */
  color?: string;
  height?: number;
}) {
  const styles = useStyles();
  const colors = useColors();
  const pct = Math.max(0, Math.min(1, value || 0));
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <View
        style={{
          width: `${pct * 100}%`,
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: color ?? colors.accent
        }}
      />
    </View>
  );
}

export function Dot({ color, size = 10 }: { color: string; size?: number }) {
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }}
    />
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  const styles = useStyles();
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {!!hint && <Text style={styles.emptyHint}>{hint}</Text>}
    </View>
  );
}

const useStyles = themed((colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: hairline,
    borderColor: colors.line,
    padding: space.lg,
    marginBottom: space.md
  },
  cardFlush: { padding: 0, overflow: 'hidden' },
  tile: { flexGrow: 1, flexBasis: '30%', marginBottom: 0, padding: space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.md },

  screenTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    marginBottom: space.lg
  },
  screenTitle: { ...type.h1, color: colors.text, flexShrink: 1 },
  sectionTitle: {
    ...type.kicker,
    color: colors.muted,
    marginBottom: space.sm,
    marginTop: space.sm
  },

  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    minHeight: 54,
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    borderWidth: hairline,
    borderColor: 'transparent'
  },
  btnSm: { minHeight: 42, paddingHorizontal: space.lg },
  btnPrimary: { backgroundColor: colors.accent },
  btnGhost: { backgroundColor: colors.surface, borderColor: colors.line },
  btnQuiet: { backgroundColor: 'transparent' },
  btnDanger: { backgroundColor: 'transparent', borderColor: colors.danger },
  btnDim: { opacity: 0.55 },
  btnLabel: { ...type.title, fontSize: 16, fontWeight: '600' },
  btnLabelSm: { fontSize: 14 },

  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },

  segTrack: {
    flexDirection: 'row',
    backgroundColor: colors.surface2,
    borderRadius: radius.pill,
    padding: 3,
    gap: 2
  },
  seg: {
    flex: 1,
    /* 44, not the 38 that looked right: this is the tap target itself, and a
       row of five of them across a phone is already the narrowest thing on the
       screen without also being the shortest. */
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.sm,
    borderRadius: radius.pill
  },
  segOn: { backgroundColor: colors.surface3, borderWidth: hairline, borderColor: colors.line },
  segLabel: { ...type.label, color: colors.muted },
  segLabelOn: { color: colors.text, fontWeight: '700' },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: hairline,
    borderColor: colors.line,
    backgroundColor: colors.surface
  },
  chipOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  chipLabel: { ...type.label, color: colors.muted },
  chipLabelOn: { color: colors.accentText, fontWeight: '700' },

  stat: { gap: 2 },
  statValue: { ...type.h2, color: colors.text },
  statLabel: { ...type.caption, color: colors.muted },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: 14,
    minHeight: 56
  },
  rowDivider: { borderTopWidth: hairline, borderTopColor: colors.line },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { ...type.title, color: colors.text },
  rowSubtitle: { ...type.caption, color: colors.muted },
  rowValue: { ...type.label, color: colors.muted, ...type.numeric },

  track: { backgroundColor: colors.surface2, overflow: 'hidden', width: '100%' },

  empty: { alignItems: 'center', paddingVertical: space.xl, gap: space.xs },
  emptyTitle: { ...type.title, color: colors.text },
  emptyHint: { ...type.body, color: colors.muted, textAlign: 'center' }
}));
