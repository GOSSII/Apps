import React, { useState } from 'react';
import {
  ActivityIndicator, Platform, Pressable, StyleSheet, Text, View
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppProvider, useApp, useT } from './src/store';
import type { Key } from './src/i18n';
import TodayScreen from './src/screens/TodayScreen';
import StatsScreen from './src/screens/StatsScreen';
import SubjectsScreen from './src/screens/SubjectsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import FocusScreen from './src/screens/FocusScreen';
import { ThemeProvider, space, themed, useColors, useTheme } from './src/theme';

type TabKey = 'today' | 'stats' | 'subjects' | 'settings';

const TABS: { key: TabKey; labelKey: Key; icon: string }[] = [
  { key: 'today', labelKey: 'tabToday', icon: '⏱' },
  { key: 'stats', labelKey: 'tabStats', icon: '📊' },
  { key: 'subjects', labelKey: 'tabSubjects', icon: '📚' },
  { key: 'settings', labelKey: 'tabSettings', icon: '⚙️' }
];

/* Four screens and no deep links — a tab bar over local state is the whole
   navigation need here, and it keeps the bundle (and the install) small. */
function Root() {
  const { ready, state } = useApp();
  const t = useT();
  const styles = useStyles();
  const colors = useColors();
  const [tab, setTab] = useState<TabKey>('today');

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
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
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.screen}>
        {tab === 'today' && <TodayScreen onManageSubjects={() => setTab('subjects')} />}
        {tab === 'stats' && <StatsScreen />}
        {tab === 'subjects' && <SubjectsScreen />}
        {tab === 'settings' && <SettingsScreen />}
      </View>

      <View style={styles.tabBar}>
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
              <View>
                <Text style={[styles.tabIcon, selected && styles.tabIconOn]}>{icon}</Text>
                {showRunningDot && <View style={styles.runningDot} />}
              </View>
              <Text style={[styles.tabLabel, selected && styles.tabLabelOn]}>
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

const useStyles = themed((colors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  screen: { flex: 1 },
  loading: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
    /* The bar is the one surface that must read as attached, not floating. */
    paddingTop: space.sm,
    paddingBottom: Platform.OS === 'web' ? space.sm : space.xs
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: space.xs },
  tabIcon: { fontSize: 20, opacity: 0.55 },
  tabIconOn: { opacity: 1 },
  tabLabel: { color: colors.muted, fontSize: 11, marginTop: 2 },
  tabLabelOn: { color: colors.text, fontWeight: '700' },
  runningDot: {
    position: 'absolute',
    top: -1,
    right: -6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.good
  }
}));
