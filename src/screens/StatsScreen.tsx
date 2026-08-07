import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card, Chip, Dot, Empty, ProgressBar, SectionTitle } from '../components/ui';
import { Button } from '../components/ui';
import { Confirm, Sheet } from '../components/Modals';
import { colors, radius, space } from '../theme';
import { useApp, useT, useDuration } from '../store';
import { hours } from '../lib/format';
import { dateInputValue, dayKey, parseDateInput, prettyDate, weekdayLetter } from '../lib/dates';
import { bestStreak, dayTotals, recentDays, totalsBySubject } from '../lib/stats';
import { addDays } from '../lib/dates';

const CHART_HEIGHT = 140;
const RECENT_PREVIEW = 6;

export default function StatsScreen() {
  const { state, editSession, deleteSession } = useApp();
  const t = useT();
  const dur = useDuration();
  const { sessions, subjects, dailyTargetMinutes } = state;
  const targetSeconds = dailyTargetMinutes * 60;

  const [range, setRange] = useState<7 | 30>(7);
  const [scope, setScope] = useState<'week' | 'all'>('week');
  const [showAll, setShowAll] = useState(false);
  const [editing, setEditing] = useState<
    { id: string; minutes: string; date: string; subjectId: string } | null
  >(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const totals = useMemo(() => dayTotals(sessions), [sessions]);
  const week = useMemo(() => recentDays(7), []);
  const days = useMemo(() => recentDays(range), [range]);

  const weekSeconds = week.reduce((sum, d) => sum + (totals[d] || 0), 0);
  const allSeconds = sessions.reduce((sum, s) => sum + s.seconds, 0);
  const daysHit = week.filter(d => (totals[d] || 0) >= targetSeconds).length;
  const best = useMemo(() => bestStreak(totals, targetSeconds), [totals, targetSeconds]);

  /* Scale to the target unless a day beat it, so a good day is visibly a
     good day rather than always filling the chart. */
  const peak = Math.max(targetSeconds, ...days.map(d => totals[d] || 0));

  const since = scope === 'week' ? week[0] : undefined;
  const bySubject = useMemo(() => totalsBySubject(sessions, since), [sessions, since]);
  const scopeTotal = scope === 'week' ? weekSeconds : allSeconds;

  const subjectName = (id: string) =>
    subjects.find(s => s.id === id)?.name ?? t('subject');
  const subjectColor = (id: string) =>
    subjects.find(s => s.id === id)?.color ?? colors.accent;

  const recent = useMemo(
    () => [...sessions].sort((a, b) => b.endedAt - a.endedAt),
    [sessions]
  );
  const visible = showAll ? recent : recent.slice(0, RECENT_PREVIEW);

  /* 12 weeks of days, column per week, oldest first. */
  const calendarWeeks = useMemo(() => {
    const days = recentDays(84);
    const weeks: string[][] = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
    return weeks;
  }, []);

  const timedRounds = sessions.filter(s => s.planned);
  const totalDistractions = sessions.reduce((sum, s) => sum + (s.distractions || 0), 0);
  const cleanRounds = timedRounds.filter(s => !s.distractions).length;
  const cleanRoundsLabel = timedRounds.length
    ? `${cleanRounds}/${timedRounds.length}`
    : '—';
  const deletingSession = recent.find(s => s.id === deleting) || null;

  if (sessions.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.h1}>{t('stats')}</Text>
        <Card><Empty title={t('noStatsTitle')} hint={t('noStatsHint')} /></Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.h1}>{t('stats')}</Text>

      <Card>
        <View style={styles.statRow}>
          <Stat label={t('thisWeek')} value={dur(weekSeconds)} />
          <Stat label={t('dailyAvg')} value={dur(Math.round(weekSeconds / 7))} />
          <Stat label={t('targetHit')} value={`${daysHit}/7`} />
        </View>
      </Card>

      <View style={styles.chipRow}>
        <Chip label={t('last7')} selected={range === 7} onPress={() => setRange(7)} testID="range-7" />
        <Chip label={t('last30')} selected={range === 30} onPress={() => setRange(30)} testID="range-30" />
      </View>

      <Card>
        <View style={styles.chart}>
          <View style={[styles.targetLine, { bottom: (targetSeconds / peak) * CHART_HEIGHT }]} />
          {days.map((day, i) => {
            const secs = totals[day] || 0;
            const hit = secs >= targetSeconds;
            const isToday = day === dayKey();
            /* At 30 bars there is no room for a label under each one. */
            const label = range === 7
              ? weekdayLetter(day)
              : isToday || i % 5 === 0 ? day.slice(-2) : '';
            return (
              <View key={day} style={styles.barCol}>
                {range === 7 && (
                  <Text style={styles.barValue}>{secs > 0 ? hours(secs) : ''}</Text>
                )}
                <View
                  style={[
                    styles.bar,
                    range === 30 && styles.barThin,
                    {
                      height: Math.max(secs > 0 ? 4 : 2, (secs / peak) * CHART_HEIGHT),
                      backgroundColor: hit ? colors.good : secs > 0 ? colors.accent : colors.surface2
                    }
                  ]}
                />
                <Text style={[styles.barLabel, isToday && styles.barLabelToday]}>{label}</Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.legend}>
          {t('chartLegend', { target: dur(targetSeconds) })}
        </Text>
      </Card>

      <SectionTitle>{t('bySubject')}</SectionTitle>
      <View style={styles.chipRow}>
        <Chip label={t('thisWeek')} selected={scope === 'week'} onPress={() => setScope('week')} />
        <Chip label={t('allTime')} selected={scope === 'all'} onPress={() => setScope('all')} />
      </View>

      <Card>
        {subjects.length === 0 && <Empty title={t('nothingAdded')} />}
        {subjects.map((subject, i) => {
          const secs = bySubject[subject.id] || 0;
          const share = scopeTotal > 0 ? secs / scopeTotal : 0;
          return (
            <View key={subject.id} style={i > 0 ? styles.subjectBlock : undefined}>
              <View style={styles.subjectHead}>
                <Dot color={subject.color} />
                <Text style={styles.subjectName}>{subject.name}</Text>
                <Text style={styles.subjectSecs}>{dur(secs)}</Text>
              </View>
              <ProgressBar value={share} color={subject.color} height={8} />
            </View>
          );
        })}
      </Card>

      <SectionTitle>{t('recentSittings')}</SectionTitle>
      <Card style={{ padding: 0 }}>
        {visible.map((session, i) => (
          <View key={session.id} style={[styles.sittingRow, i > 0 && styles.divider]}>
            <Dot color={subjectColor(session.subjectId)} />
            <View style={styles.flex}>
              <Text style={styles.sittingName}>{subjectName(session.subjectId)}</Text>
              <Text style={styles.sittingMeta}>
                {prettyDate(session.day)}
                {session.manual ? ` · ${t('manualTag')}` : ''}
                {session.distractions
                  ? ` · ${session.distractions === 1
                      ? t('checkOne')
                      : t('checkMany', { n: session.distractions })}`
                  : ''}
              </Text>
            </View>
            <Text style={styles.sittingTime}>{dur(session.seconds)}</Text>
            <Pressable
              onPress={() => {
                setEditError(null);
                setEditing({
                  id: session.id,
                  minutes: String(Math.round(session.seconds / 60)),
                  date: dateInputValue(session.day),
                  subjectId: session.subjectId
                });
              }}
              style={styles.action}
            >
              <Text style={styles.actionText}>{t('edit')}</Text>
            </Pressable>
            <Pressable onPress={() => setDeleting(session.id)} style={styles.action}>
              <Text style={[styles.actionText, { color: colors.danger }]}>{t('delete')}</Text>
            </Pressable>
          </View>
        ))}
        {!showAll && recent.length > RECENT_PREVIEW && (
          <Pressable onPress={() => setShowAll(true)} style={styles.showAll}>
            <Text style={styles.showAllText}>{t('showAll', { n: recent.length })}</Text>
          </Pressable>
        )}
      </Card>

      <SectionTitle>{t('calendarTitle')}</SectionTitle>
      <Card>
        <View style={styles.calendar}>
          {calendarWeeks.map((week, wi) => (
            <View key={wi} style={styles.calWeek}>
              {week.map(day => {
                const secs = totals[day] || 0;
                const share = secs / targetSeconds;
                return (
                  <View
                    key={day}
                    style={[
                      styles.calCell,
                      { backgroundColor: heatColour(share) },
                      day === dayKey() && styles.calToday
                    ]}
                  />
                );
              })}
            </View>
          ))}
        </View>
        <Text style={styles.legend}>{t('calendarLegend')}</Text>
      </Card>

      <Card>
        <View style={styles.statRow}>
          <Stat label={t('phoneChecks')} value={String(totalDistractions)} />
          <Stat label={t('focusRate')} value={cleanRoundsLabel} />
        </View>
      </Card>

      <Card>
        <View style={styles.statRow}>
          <Stat
            label={t('bestStreak')}
            value={t(best === 1 ? 'dayUnit' : 'daysUnit', { n: best })}
          />
          <Stat label={t('totalHours')} value={hours(allSeconds)} />
          <Stat label={t('sittings')} value={String(sessions.length)} />
        </View>
      </Card>

      <Sheet visible={editing !== null} title={t('editSitting')} onClose={() => setEditing(null)}>
        <Text style={styles.label}>{t('minutesStudied')}</Text>
        <TextInput
          value={editing?.minutes ?? ''}
          onChangeText={text => setEditing(e => (e ? { ...e, minutes: text } : e))}
          keyboardType="number-pad"
          testID="edit-minutes"
          style={styles.input}
          placeholderTextColor={colors.muted}
        />

        <Text style={styles.label}>{t('sittingDate')}</Text>
        <TextInput
          value={editing?.date ?? ''}
          onChangeText={text => setEditing(e => (e ? { ...e, date: text } : e))}
          testID="edit-date"
          style={styles.input}
          placeholderTextColor={colors.muted}
        />

        <Text style={styles.label}>{t('subject')}</Text>
        <View style={styles.chipWrapSheet}>
          {subjects.map(sub => (
            <Chip
              key={sub.id}
              label={sub.name}
              selected={editing?.subjectId === sub.id}
              onPress={() => setEditing(e => (e ? { ...e, subjectId: sub.id } : e))}
              testID={`edit-subject-${sub.id}`}
            />
          ))}
        </View>

        {!!editError && <Text style={styles.error}>{editError}</Text>}

        <View style={styles.sheetRow}>
          <Button label={t('cancel')} variant="ghost" onPress={() => setEditing(null)} style={styles.flex} />
          <Button
            label={t('save')}
            testID="edit-save"
            onPress={() => {
              if (!editing) return;
              const day = parseDateInput(editing.date);
              if (!day) { setEditError(t('examBadDate')); return; }
              /* A sitting in the future would sit at the far end of every
                 chart and quietly inflate a streak that has not happened. */
              if (day > dayKey()) { setEditError(t('dateInFuture')); return; }
              editSession(editing.id, {
                minutes: Number(editing.minutes.replace(/[^\d.]/g, '')),
                day,
                subjectId: editing.subjectId
              });
              setEditError(null);
              setEditing(null);
            }}
            style={styles.flex}
          />
        </View>
      </Sheet>

      <Confirm
        visible={deleting !== null}
        title={t('deleteSittingTitle')}
        message={deletingSession
          ? t('deleteSittingMsg', {
              time: dur(deletingSession.seconds),
              subject: subjectName(deletingSession.subjectId)
            })
          : undefined}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        destructive
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) deleteSession(deleting);
          setDeleting(null);
        }}
      />
    </ScrollView>
  );
}

/** Four steps, not a continuous ramp: the eye reads bands, not gradients. */
function heatColour(share: number): string {
  if (share <= 0) return colors.surface2;
  if (share < 0.34) return 'rgba(124, 92, 255, 0.32)';
  if (share < 0.67) return 'rgba(124, 92, 255, 0.62)';
  if (share < 1) return colors.accent;
  return colors.good;
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
  barThin: { width: '70%', borderRadius: 3 },
  barLabel: { color: colors.muted, fontSize: 11, marginTop: 6, height: 20 },
  barLabelToday: { color: colors.text, fontWeight: '800' },
  legend: { color: colors.muted, fontSize: 12, marginTop: space.sm },
  chipRow: { flexDirection: 'row', marginBottom: space.xs },
  calendar: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  calWeek: { flex: 1, gap: 4 },
  calCell: { width: '100%', aspectRatio: 1, borderRadius: 3 },
  calToday: { borderWidth: 1, borderColor: colors.text },
  subjectBlock: { marginTop: space.lg },
  subjectHead: { flexDirection: 'row', alignItems: 'center', marginBottom: space.sm },
  subjectName: { color: colors.text, fontWeight: '700', flex: 1 },
  subjectSecs: { color: colors.muted, fontVariant: ['tabular-nums'] },
  sittingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    gap: space.sm
  },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
  flex: { flex: 1 },
  sittingName: { color: colors.text, fontWeight: '700' },
  sittingMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  sittingTime: {
    color: colors.text,
    fontVariant: ['tabular-nums'],
    fontSize: 13,
    fontWeight: '600'
  },
  action: { paddingHorizontal: space.xs, paddingVertical: space.sm },
  actionText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  showAll: { padding: space.md, alignItems: 'center' },
  showAllText: { color: colors.accent, fontWeight: '700', fontSize: 13 },
  label: { color: colors.muted, marginBottom: space.sm, fontSize: 13 },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 18,
    padding: space.md,
    marginBottom: space.lg
  },
  sheetRow: { flexDirection: 'row', gap: space.md },
  chipWrapSheet: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: space.md },
  error: { color: colors.danger, fontSize: 13, marginBottom: space.sm }
});
