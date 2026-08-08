import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, Dot, Empty, SectionTitle } from '../components/ui';
import { space, themed } from '../theme';
import { useApp, useDuration, useT, useToday } from '../store';
import { daysApart, prettyDate } from '../lib/dates';
import { dayTotalsFor, lastStudied, recentDays } from '../lib/stats';
import type { Subject } from '../types';

/* One subject on its own.

   The by-subject bars on Stats answer "where did the hours go", which is a
   question about the week. This answers the one that actually changes what an
   aspirant does tomorrow: have I been quietly avoiding this? A large all-time
   total hides a fortnight of neglect, so "last studied 9 days ago" is the line
   that carries the screen — not the total. */

const CHART_HEIGHT = 110;
const RECENT = 8;

export default function SubjectDetailScreen({ subject, onBack }: {
  subject: Subject;
  onBack: () => void;
}) {
  const { state } = useApp();
  const t = useT();
  const dur = useDuration();
  const styles = useStyles();
  const today = useToday();

  const totals = useMemo(
    () => dayTotalsFor(state.sessions, subject.id),
    [state.sessions, subject.id]
  );
  const days = useMemo(() => recentDays(30), [today]);
  const week = useMemo(() => recentDays(7), [today]);

  const allSeconds = Object.values(totals).reduce((sum, n) => sum + n, 0);
  const weekSeconds = week.reduce((sum, d) => sum + (totals[d] || 0), 0);

  /* Everyone's week, so the share is of what was actually studied rather than
     of the target — a light week should not make one subject look dominant. */
  const weekAll = useMemo(
    () => week.reduce((sum, d) =>
      sum + state.sessions.filter(s => s.day === d).reduce((n, s) => n + s.seconds, 0), 0),
    [state.sessions, week]
  );
  const share = weekAll > 0 ? Math.round((weekSeconds / weekAll) * 100) : 0;

  const last = lastStudied(state.sessions, subject.id);
  /* Counted from the dates, never from the chart's own array: a subject last
     studied before the window would come back as -1 from an index lookup and
     render as a plausible, wrong "30 days ago". */
  const sinceLine = ((): string => {
    if (!last) return t('subjectNeverStudied');
    const gap = daysApart(last, today);
    if (gap === 0) return t('subjectStudiedToday');
    if (gap === 1) return t('subjectStudiedYesterday');
    return t('subjectStudiedDaysAgo', { n: gap });
  })();

  /* Scale to this subject's own best day: it is being read on its own, and
     scaling to the daily target would flatten every subject of a five-subject
     timetable into nothing. */
  const peak = Math.max(1, ...days.map(d => totals[d] || 0));

  const sittings = useMemo(
    () => state.sessions
      .filter(s => s.subjectId === subject.id)
      .sort((a, b) => b.endedAt - a.endedAt)
      .slice(0, RECENT),
    [state.sessions, subject.id]
  );

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable onPress={onBack} style={styles.back} testID="subject-back">
        <Text style={styles.backText}>‹ {t('subjectBack')}</Text>
      </Pressable>

      <View style={styles.head}>
        <Dot color={subject.color} />
        <Text style={styles.h1} testID="subject-name">{subject.name}</Text>
      </View>
      <Text style={styles.since} testID="subject-since">{sinceLine}</Text>

      <Card>
        <View style={styles.statRow}>
          <Stat label={t('subjectThisWeek')} value={dur(weekSeconds)} />
          <Stat label={t('subjectAllTime')} value={dur(allSeconds)} testID="subject-all" />
          <Stat label={t('subjectShareLabel')} value={`${share}%`} />
        </View>
      </Card>

      <SectionTitle>{t('subjectLast30')}</SectionTitle>
      <Card>
        <View style={styles.chart}>
          {days.map((day, i) => {
            const secs = totals[day] || 0;
            const isToday = day === today;
            return (
              <View key={day} style={styles.barCol}>
                {secs > 0 && (
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max(4, (secs / peak) * CHART_HEIGHT),
                        backgroundColor: subject.color
                      }
                    ]}
                  />
                )}
                {/* Dates, not weekday letters: every seventh column of a
                    30-day window is the same weekday, so letters here spelled
                    F F F F F and said nothing. */}
                <Text style={[styles.barLabel, isToday && styles.barLabelToday]}>
                  {isToday || i % 5 === 0 ? day.slice(-2) : ''}
                </Text>
              </View>
            );
          })}
        </View>
      </Card>

      <SectionTitle>{t('subjectSittings')}</SectionTitle>
      <Card style={sittings.length ? styles.flush : undefined}>
        {sittings.length === 0 ? (
          <Empty title={t('subjectNoSittings')} />
        ) : sittings.map((s, i) => (
          <View key={s.id} style={[styles.row, i > 0 && styles.divider]}>
            <View style={styles.flex}>
              <Text style={styles.rowDay}>{prettyDate(s.day)}</Text>
              {!!s.manual && <Text style={styles.rowMeta}>{t('manualTag')}</Text>}
            </View>
            <Text style={styles.rowTime}>{dur(s.seconds)}</Text>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

function Stat({ label, value, testID }: { label: string; value: string; testID?: string }) {
  const styles = useStyles();
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} testID={testID}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const useStyles = themed((colors) => StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xl * 2 },
  back: { minHeight: 44, justifyContent: 'center', marginBottom: space.xs },
  backText: { color: colors.accentText, fontWeight: '700', fontSize: 15 },
  head: { flexDirection: 'row', alignItems: 'center' },
  h1: { color: colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  since: { color: colors.muted, fontSize: 14, marginTop: 2, marginBottom: space.lg },
  statRow: { flexDirection: 'row' },
  stat: { flex: 1 },
  statValue: { color: colors.text, fontSize: 20, fontWeight: '800' },
  statLabel: { color: colors.muted, fontSize: 12, marginTop: 2 },
  chart: {
    height: CHART_HEIGHT + 24,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between'
  },
  barCol: { flex: 1, alignItems: 'center' },
  bar: { width: '70%', borderRadius: 3 },
  barLabel: { color: colors.muted, fontSize: 10, marginTop: 6, height: 14 },
  barLabelToday: { color: colors.text, fontWeight: '800' },
  flush: { padding: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.md
  },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
  flex: { flex: 1 },
  rowDay: { color: colors.text, fontWeight: '700' },
  rowMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  rowTime: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 13,
    fontVariant: ['tabular-nums']
  },
}));
