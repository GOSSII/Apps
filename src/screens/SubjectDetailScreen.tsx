import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  Button, Card, Dot, Empty, IconButton, SCREEN_PAD, SectionTitle, Stat, StatGrid, Tile
} from '../components/ui';
import { Confirm, Sheet } from '../components/Modals';
import { hairline, radius, space, themed, type, useColors } from '../theme';
import { useApp, useDuration, useT, useToday } from '../store';
import { daysApart, prettyDate } from '../lib/dates';
import { dayTotalsFor, lastStudied, recentDays } from '../lib/stats';
import type { Subject } from '../types';

/* One subject on its own.

   The by-subject bars on Stats answer "where did the hours go", which is a
   question about the week. This answers the one that actually changes what an
   aspirant does tomorrow: have I been quietly avoiding this? A large all-time
   total hides a fortnight of neglect, so "last studied 9 days ago" is the line
   that carries the screen — not the total.

   Rename and delete live here rather than on the list, because this is the
   screen you are already on when you decide a subject needs either. */

const CHART_HEIGHT = 104;
const RECENT = 8;

export default function SubjectDetailScreen({ subject, onBack }: {
  subject: Subject;
  onBack: () => void;
}) {
  const { state, renameSubject, deleteSubject } = useApp();
  const t = useT();
  const dur = useDuration();
  const styles = useStyles();
  const colors = useColors();
  const today = useToday();

  const [renaming, setRenaming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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
  const gap = last ? daysApart(last, today) : null;
  const sinceLine = ((): string => {
    if (gap === null) return t('subjectNeverStudied');
    if (gap === 0) return t('subjectStudiedToday');
    if (gap === 1) return t('subjectStudiedYesterday');
    return t('subjectStudiedDaysAgo', { n: gap });
  })();
  /* A week untouched is the whole reason this line leads the screen, so past
     that point it stops being grey text and starts being a warning. */
  const cold = gap === null || gap >= 7;

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
  const sittingCount = state.sessions.filter(s => s.subjectId === subject.id).length;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.bar}>
        <IconButton
          name="chevronLeft"
          tone="text"
          label={t('subjectBack')}
          onPress={onBack}
          testID="subject-back"
        />
        <View style={styles.flex} />
        <IconButton
          name="pencil"
          label={`${t('rename')} — ${subject.name}`}
          onPress={() => setRenaming(subject.name)}
          testID="subject-rename"
        />
        <IconButton
          name="trash"
          tone="danger"
          label={`${t('delete')} — ${subject.name}`}
          onPress={() => setDeleting(true)}
          testID="subject-delete"
        />
      </View>

      <View style={styles.head}>
        <Dot color={subject.color} size={12} />
        <Text style={styles.h1} testID="subject-name">{subject.name}</Text>
      </View>
      <View style={[styles.sincePill, cold && styles.sincePillCold]}>
        <Text style={[styles.since, cold && styles.sinceCold]} testID="subject-since">
          {sinceLine}
        </Text>
      </View>

      <StatGrid>
        <Tile><Stat label={t('subjectThisWeek')} value={dur(weekSeconds)} /></Tile>
        <Tile><Stat label={t('subjectAllTime')} value={dur(allSeconds)} testID="subject-all" /></Tile>
        <Tile><Stat label={t('subjectShareLabel')} value={`${share}%`} /></Tile>
      </StatGrid>

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
                      styles.chartBar,
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
      <Card flush={sittings.length > 0}>
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

      <Sheet
        visible={renaming !== null}
        title={t('renameSubject')}
        onClose={() => setRenaming(null)}
      >
        <TextInput
          value={renaming ?? ''}
          onChangeText={setRenaming}
          style={styles.input}
          placeholderTextColor={colors.muted}
          testID="rename-input"
        />
        <View style={styles.sheetRow}>
          <Button
            label={t('cancel')}
            variant="ghost"
            onPress={() => setRenaming(null)}
            style={styles.flex}
          />
          <Button
            label={t('save')}
            testID="rename-save"
            onPress={() => {
              if (renaming) renameSubject(subject.id, renaming);
              setRenaming(null);
            }}
            style={styles.flex}
          />
        </View>
      </Sheet>

      <Confirm
        visible={deleting}
        title={t('deleteSubjectTitle', { name: subject.name })}
        message={sittingCount > 0
          ? t('deleteSubjectWithSessions', { n: sittingCount })
          : t('cannotUndo')}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        destructive
        onCancel={() => setDeleting(false)}
        onConfirm={() => {
          setDeleting(false);
          /* Back first: deleting while this screen is mounted leaves it
             rendering a subject that no longer exists for one frame. */
          onBack();
          deleteSubject(subject.id);
        }}
      />
    </ScrollView>
  );
}

const useStyles = themed((colors) => StyleSheet.create({
  content: { paddingHorizontal: SCREEN_PAD, paddingTop: space.xs, paddingBottom: 120 },
  bar: { flexDirection: 'row', alignItems: 'center', marginLeft: -space.md, marginBottom: space.sm },
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  h1: { ...type.h1, color: colors.text, flexShrink: 1 },
  sincePill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface2,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 5,
    marginTop: space.sm,
    marginBottom: space.lg
  },
  sincePillCold: { backgroundColor: colors.surface },
  since: { ...type.label, color: colors.muted },
  sinceCold: { color: colors.warn, fontWeight: '700' },

  chart: {
    height: CHART_HEIGHT + 24,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between'
  },
  barCol: { flex: 1, alignItems: 'center' },
  chartBar: { width: '68%', borderRadius: 3 },
  barLabel: { ...type.caption, fontSize: 10, color: colors.muted, marginTop: 6, height: 14 },
  barLabelToday: { color: colors.text, fontWeight: '800' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: 14
  },
  divider: { borderTopWidth: hairline, borderTopColor: colors.line },
  rowDay: { ...type.title, color: colors.text },
  rowMeta: { ...type.caption, color: colors.muted, marginTop: 1 },
  rowTime: { ...type.label, color: colors.text, ...type.numeric },

  input: {
    backgroundColor: colors.bg,
    borderWidth: hairline,
    borderColor: colors.line,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 17,
    padding: space.md,
    minHeight: 50,
    marginBottom: space.lg
  },
  sheetRow: { flexDirection: 'row', gap: space.md }
}));
