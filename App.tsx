import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaProvider, SafeAreaView, useSafeAreaInsets
} from 'react-native-safe-area-context';
import { AppProvider, useApp, useT } from './src/store';
import type { Key } from './src/i18n';
import TodayScreen from './src/screens/TodayScreen';
import StatsScreen from './src/screens/StatsScreen';
import SubjectsScreen from './src/screens/SubjectsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import FocusScreen from './src/screens/FocusScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { Celebration } from './src/components/Celebration';
import { NudgeScheduler } from './src/components/NudgeScheduler';
import { Icon, type IconName } from './src/components/Icon';
import {
  ThemeProvider, hairline, radius, space, themed, type, useColors, useTheme
} from './src/theme';

type TabKey = 'today' | 'stats' | 'subjects' | 'settings';

const TABS: { key: TabKey; labelKey: Key; icon: IconName }[] = [
  { key: 'today', labelKey: 'tabToday', icon: 'timer' },
  { key: 'stats', labelKey: 'tabStats', icon: 'chart' },
  { key: 'subjects', labelKey: 'tabSubjects', icon: 'book' },
  { key: 'settings', labelKey: 'tabSettings', icon: 'settings' }
];

/* Four screens and no deep links — a tab bar over local state is the whole
   navigation need here, and it keeps the bundle (and the install) small.

   The bar floats above the content rather than sitting in a well at the bottom
   of it. That is partly how it looks and mostly where it is: a bar that is
   inset from the edge puts every tab inside the arc a thumb sweeps, and the
   content scrolls underneath it instead of stopping short. */
function Root() {
  const { ready, state } = useApp();
  const t = useT();
  const styles = useStyles();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabKey>('today');

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  /* First run, before anything else: the tab bar would only offer places to
     get lost in before the app knows what the user is even studying. */
  if (!state.onboarded) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <OnboardingScreen />
      </SafeAreaView>
    );
  }

  /* A running sitting takes over the whole screen — no tabs, nothing to
     wander off into. That is the point of the mode. */
  if (state.active) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <FocusScreen />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.screen}>
        {tab === 'today' && <TodayScreen onManageSubjects={() => setTab('subjects')} />}
        {tab === 'stats' && <StatsScreen />}
        {tab === 'subjects' && <SubjectsScreen />}
        {tab === 'settings' && <SettingsScreen />}
      </View>

      <View style={[styles.tabBar, { marginBottom: Math.max(insets.bottom, space.md) }]}>
        {TABS.map(({ key, labelKey, icon }) => {
          const selected = tab === key;
          const showRunningDot = key === 'today' && !!state.active?.runningSince;
          return (
            <Pressable
              key={key}
              testID={`tab-${key}`}
              onPress={() => setTab(key)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              aria-selected={selected}
              style={styles.tab}
            >
              <View style={[styles.tabIcon, selected && styles.tabIconOn]}>
                <Icon
                  name={icon}
                  size={20}
                  color={selected ? colors.accentText : colors.muted}
                  strokeWidth={selected ? 2 : 1.7}
                />
                {showRunningDot && <View style={styles.runningDot} />}
              </View>
              <Text style={[styles.tabLabel, selected && styles.tabLabelOn]} numberOfLines={1}>
                {t(labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

/* The preference is app state, so the theme can only be resolved inside the
   provider that holds it — hence a component in between rather than wrapping
   ThemeProvider around AppProvider. */
function Themed() {
  const { state } = useApp();
  return (
    <ThemeProvider pref={state.themePref}>
      <Bar />
      <Root />
      {/* Renders nothing — it keeps the two background nudges in step with
          whatever the data now says. */}
      <NudgeScheduler />
      {/* Above everything, including full-screen focus mode — the target is
          often crossed by the round that is still on screen. */}
      <Celebration />
    </ThemeProvider>
  );
}

/* The status bar is the one piece of chrome the app does not draw itself, and
   dark glyphs on a near-black ground are simply invisible. */
function Bar() {
  return <StatusBar style={useTheme() === 'dark' ? 'light' : 'dark'} />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Themed />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const useStyles = themed((colors, shadow) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  screen: { flex: 1 },
  loading: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tabBar: {
    ...shadow,
    flexDirection: 'row',
    marginHorizontal: space.lg,
    paddingHorizontal: space.xs,
    paddingVertical: space.sm,
    borderRadius: radius.xl,
    borderWidth: hairline,
    borderColor: colors.line,
    backgroundColor: colors.surface
  },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  tabIcon: {
    minWidth: 52,
    height: 30,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tabIconOn: { backgroundColor: colors.accentSoft },
  tabLabel: { ...type.caption, fontSize: 11, color: colors.muted },
  tabLabelOn: { color: colors.accentText, fontWeight: '700' },
  runningDot: {
    position: 'absolute',
    top: 2,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.good
  }
}));
