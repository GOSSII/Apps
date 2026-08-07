import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { subjectPalette, useColors } from '../theme';

/* Confetti on one clock.

   Thirty-odd pieces could each own an Animated.Value, but that is thirty-odd
   animations to keep in step and thirty-odd chances for one to be left running.
   Instead a single value runs 0→1 and every piece interpolates its own slice of
   it — its own start, its own fall time, its own drift and spin. One animation
   to start, one to stop, and all of it on the native driver, so a mid-round
   celebration does not fight the JS thread with the timer.

   The colours are the subject palette, which is the one set already proven to
   clear 3:1 on both grounds — confetti nobody can see on a dark phone would be
   a strange thing to ship. */

const COUNT = 34;
const DURATION = 2800;

/** Deterministic per mount, so a re-render does not reshuffle mid-fall. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Piece = {
  colour: string;
  left: string;
  size: number;
  round: boolean;
  delay: number;
  span: number;
  drift: number;
  spin: number;
};

export function Confetti({ seed = 1, height = 900 }: {
  /** Same seed, same fall — handy for a screenshot. */
  seed?: number;
  /** How far a piece has to travel before it is off the bottom. */
  height?: number;
}) {
  const colors = useColors();
  const clock = useRef(new Animated.Value(0)).current;

  const pieces = useMemo<Piece[]>(() => {
    const rand = mulberry32(seed);
    const palette = [...subjectPalette, colors.accent, colors.good];
    return Array.from({ length: COUNT }, () => {
      const delay = rand() * 0.28;
      return {
        colour: palette[Math.floor(rand() * palette.length)],
        left: `${rand() * 100}%`,
        size: 7 + rand() * 7,
        round: rand() > 0.6,
        delay,
        /* Kept inside the clock, so every piece has landed by the time the
           animation ends and nothing is frozen mid-air. */
        span: Math.min(0.62 + rand() * 0.24, 1 - delay),
        drift: (rand() - 0.5) * 130,
        spin: 180 + rand() * 900
      };
    });
  }, [seed, colors.accent, colors.good]);

  useEffect(() => {
    const animation = Animated.timing(clock, {
      toValue: 1,
      duration: DURATION,
      easing: Easing.linear,
      useNativeDriver: true
    });
    animation.start();
    return () => animation.stop();
  }, [clock]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" aria-hidden>
      {pieces.map((p, i) => {
        const end = p.delay + p.span;
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              top: -20,
              left: p.left as `${number}%`,
              width: p.size,
              height: p.round ? p.size : p.size * 1.6,
              borderRadius: p.round ? p.size / 2 : 2,
              backgroundColor: p.colour,
              opacity: clock.interpolate({
                inputRange: [p.delay, p.delay + 0.02, end - 0.14, end],
                outputRange: [0, 1, 1, 0],
                extrapolate: 'clamp'
              }),
              transform: [
                {
                  translateY: clock.interpolate({
                    inputRange: [p.delay, end],
                    outputRange: [0, height + 40],
                    extrapolate: 'clamp'
                  })
                },
                {
                  translateX: clock.interpolate({
                    inputRange: [p.delay, end],
                    outputRange: [0, p.drift],
                    extrapolate: 'clamp'
                  })
                },
                {
                  rotate: clock.interpolate({
                    inputRange: [p.delay, end],
                    outputRange: ['0deg', `${p.spin}deg`],
                    extrapolate: 'clamp'
                  })
                }
              ]
            }}
          />
        );
      })}
    </View>
  );
}
