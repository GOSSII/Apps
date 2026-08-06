import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, Chip, Dot, Empty, ProgressBar, SectionTitle } from '../components/ui';
import { colors, radius, space } from '../theme';
import { useApp } from '../store';
import { humanDuration, hours } from '../lib/format';
import { dayKey, weekdayLetter } from '../lib/dates';
import { bestStreak, dayTotals, recentDays, totalsBySubject } from '../lib/stats';

const CHART_HEIGHT = 140;

export default function StatsScreen() {
  const { state } = useApp();
  const { sessions, subjects, dailyTargetMinutes } = state;
  const targetSeconds = dailyTargetMinutes * 60;

  const [range, setRange] = useState<'week' | 'all'>('week');

  const totals = useMemo(() => dayTotals(sessions), [sessions]);
  const week = useMemo(() => recentDays(7), []);
  const weekSeconds = week.reduce((sum, d) => sum + (totals[d] || 0), 0);
  const allSeconds = sessions.reduce((sum, s) => sum + s.seconds, 0);
  const daysHit = week.filter(d => (totals[d] || 0) >= targetSeconds).length;
  const best = useMemo(() => bestStreak(totals, targetSeconds), [totals, targetSeconds]);

  /* Scale to the target unless a day beat it, so a good day is visibly a
     good day rather than always filling the chart. */
  const peak = Math.max(targetSeconds, ...week.map(d => totals[d] || 0));

  const since = range === 'week' ? week[0] : undefined;
  const bySubject = useMemo(
    () => totalsBySubject(sessions, since),
    [sessions, since]
  );
  const rangeTotal = range === 'week' ? weekSeconds : allSeconds;

  if (sessions.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.h1}>Stats</Text>
        <Card>
          <Empty
            title="Nothing to show yet"
            hint="Run the timer once and your last seven days will start filling in here."
          />
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.h1}>Stats</Text>

      <Card>
        <View style={styles.statRow}>
          <Stat label="This week" value={humanDuration(weekSeconds)} />
          <Stat label="Daily avg" value={humanDuration(Math.round(weekSeconds / 7))} />
          <Stat label="Target hit" value={`${daysHit}/7`} />
        </View>
      </Card>

      <SectionTitle>Last 7 days</SectionTitle>
      <Card>
        <View style={styles.chart}>
          <View
            style={[
              styles.targetLine,
              { bottom: (targetSeconds / peak) * CHART_HEIGHT }
            ]}
          />
          {week.map(day => {
            const secs = totals[day] || 0;
            const hit = secs >= targetSeconds;
            const isToday = day === dayKey();
            return (
              <View key={day} style={styles.barCol}>
                <Text style={styles.barValue}>{secs > 0 ? hours(secs) : ''}</Text>
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(secs > 0 ? 4 : 2, (secs / peak) * CHART_HEIGHT),
                      backgroundColor: hit ? colors.good : secs > 0 ? colors.accent : colors.surface2
                    }
                  ]}
                />
                <Text style={[styles.barLabel, isToday && styles.barLabelToday]}>
                  {weekdayLetter(day)}
                </Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.legend}>
          Dotted line is your {humanDuration(targetSeconds)} daily target · green = hit
        </Text>
      </Card>

      <SectionTitle>By subject</SectionTitle>
      <View style={styles.chipRow}>
        <Chip label="This week" selected={range === 'week'} onPress={() => setRange('week')} />
        <Chip label="All time" selected={range === 'all'} onPress={() => setRange('all')} />
      </View>

      <Card>
        {subjects.length === 0 && <Empty title="No subjects" />}
        {subjects.map((subject, i) => {
          const secs = bySubject[subject.id] || 0;
          const share = rangeTotal > 0 ? secs / rangeTotal : 0;
          return (
            <View key={subject.id} style={i > 0 ? styles.subjectBlock : undefined}>
              <View style={styles.subjectHead}>
                <Dot color={subject.color} />
                <Text style={styles.subjectName}>{subject.name}</Text>
                <Text style={styles.subjectSecs}>{humanDuration(secs)}</Text>
              </View>
              <ProgressBar value={share} color={subject.color} height={8} />
            </View>
          );
        })}
      </Card>

      <Card>
        <View style={styles.statRow}>
          <Stat label="Best streak" value={`${best} day${best === 1 ? '' : 's'}`} />
          <Stat label="Total hours" value={hours(allSeconds)} />
          <Stat label="Sittings" value={String(sessions.length)} />
        </View>
      </Card>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xl * 2 },
  h1: { color: colors.text, fontSize: 28, fontWeight: '800', marginBottom: space.md },
  statRow: { flexDirection: 'row' },
  stat: { flex: 1 },
  statValue: { color: colors.text, fontSize: 20, fontWeight: '800' },
  statLabel: { color: colors.muted, fontSize: 12, marginTop: 2 },
  chart: {
    height: CHART_HEIGHT + 40,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between'
  },
  targetLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.line,
    marginBottom: 20
  },
  barCol: { flex: 1, alignItems: 'center' },
  barValue: { color: colors.muted, fontSize: 10, marginBottom: 4, height: 14 },
  bar: { width: '58%', borderRadius: radius.sm },
  barLabel: { color: colors.muted, fontSize: 12, marginTop: 6, height: 20 },
  barLabelToday: { color: colors.text, fontWeight: '800' },
  legend: { color: colors.muted, fontSize: 12, marginTop: space.sm },
  chipRow: { flexDirection: 'row', marginBottom: space.xs },
  subjectBlock: { marginTop: space.lg },
  subjectHead: { flexDirection: 'row', alignItems: 'center', marginBottom: space.sm },
  subjectName: { color: colors.text, fontWeight: '700', flex: 1 },
  subjectSecs: { color: colors.muted, fontVariant: ['tabular-nums'] }
});
