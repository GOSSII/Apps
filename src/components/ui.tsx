import React from 'react';
import {
  Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle
} from 'react-native';
import { colors, radius, space } from '../theme';

export function Card({ children, style }: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'md' | 'sm';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Button({
  label, onPress, variant = 'primary', size = 'md', disabled, style, testID
}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.btn,
        size === 'sm' && styles.btnSm,
        variant === 'primary' && styles.btnPrimary,
        variant === 'ghost' && styles.btnGhost,
        variant === 'danger' && styles.btnDanger,
        (pressed || disabled) && styles.btnDim,
        style
      ]}
    >
      <Text
        style={[
          styles.btnLabel,
          size === 'sm' && styles.btnLabelSm,
          variant === 'ghost' && { color: colors.text },
          variant === 'danger' && { color: colors.danger }
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function ProgressBar({ value, color = colors.accent, height = 10 }: {
  /** 0..1, clamped. */
  value: number;
  color?: string;
  height?: number;
}) {
  const pct = Math.max(0, Math.min(1, value || 0));
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <View
        style={{
          width: `${pct * 100}%`,
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: color
        }}
      />
    </View>
  );
}

export function Dot({ color }: { color: string }) {
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

export function Chip({ label, onPress, selected, testID }: {
  label: string;
  onPress: () => void;
  selected?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.btnDim
      ]}
    >
      <Text style={[styles.chipLabel, selected && { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {!!hint && <Text style={styles.emptyHint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    marginBottom: space.md
  },
  sectionTitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: space.sm,
    marginTop: space.xs
  },
  btn: {
    minHeight: 50,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface2
  },
  btnSm: { minHeight: 38, paddingHorizontal: space.md, borderRadius: radius.sm },
  btnPrimary: { backgroundColor: colors.accent, borderColor: colors.accent },
  btnGhost: { backgroundColor: 'transparent' },
  btnDanger: { backgroundColor: 'transparent', borderColor: colors.danger },
  btnDim: { opacity: 0.6 },
  btnLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnLabelSm: { fontSize: 14 },
  track: { backgroundColor: colors.surface2, overflow: 'hidden', width: '100%' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: space.sm },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface2,
    marginRight: space.sm,
    marginBottom: space.sm
  },
  chipSelected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  chipLabel: { color: colors.muted, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: space.xl },
  emptyTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
  emptyHint: {
    color: colors.muted,
    marginTop: space.xs,
    textAlign: 'center',
    paddingHorizontal: space.lg
  }
});
