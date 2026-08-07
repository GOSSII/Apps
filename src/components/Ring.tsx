import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '../theme';

/* The dial. Progress is drawn as a stroked arc rather than a bar because the
   number in the middle is what people look at — the ring is peripheral, and a
   circle keeps it peripheral. */
export function Ring({
  size = 260,
  stroke = 14,
  progress,
  color = colors.accent,
  trackColor = colors.surface2,
  gradientTo,
  children
}: {
  size?: number;
  stroke?: number;
  /** 0..1, clamped. */
  progress: number;
  color?: string;
  trackColor?: string;
  /** Second gradient stop; falls back to a flat stroke when absent. */
  gradientTo?: string;
  children?: React.ReactNode;
}) {
  const clamped = Math.max(0, Math.min(1, progress || 0));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  /* A hairline of arc at 0 looks like a rendering bug, so empty stays empty. */
  const dash = clamped <= 0 ? 0 : circumference * clamped;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="ringFill" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} />
            <Stop offset="1" stopColor={gradientTo ?? color} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#ringFill)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          fill="none"
          /* Start at twelve o'clock instead of three. */
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[styles.center, { width: size, height: size }]} pointerEvents="box-none">
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28
  }
});
