import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  Button, Card, Chip, Dot, Empty, IconButton, ProgressBar, SCREEN_PAD,
  ScreenTitle, Segmented, SectionTitle, Stat, StatGrid, Tile
} from '../components/ui';
import { Confirm, Sheet } from '../components/Modals';
import { type Colors, hairline, radius, space, themed, type, useColors } from '../theme';
import { useApp, useT, useDuration, useToday } from '../store';
import { hours } from '../lib/format';
import { dateInputValue, parseDateInput, prettyDate, weekdayLetter } from '../lib/dates';
import { bestStreak, dayTotals, recentDays, totalsBySubject } from '../lib/stats';

const CHART_HEIGHT = 132;
const RECENT_PREVIEW = 6;

export default function StatsScreen() {
  const { state, editSession, deleteSession } = useApp();
  const t = useT();
  const dur = useDuration();
  const styles = useStyles();
  const colors = useColors();
  const { sessions, subjects, dailyTargetMinutes } = state;
  const targetSeconds = dailyTargetMinutes * 60;

  const today = useToday();
  const [range, setRange] = useState<7 | 30>(7);
  const [scope, setScope] = useState<'week' | 'all'>('week');
  const [showAll, setShowAll] = useState(false);
  const [editing, setEditing] = useState<
    { id: string; minutes: string; date: string; subjectId: string } | null
  >(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const totals = useMemo(() => dayTotals(sessions), [sessions]);
  const week = useMemo(() => recentDays(7), [today]);
  const days = useMemo(() => recentDays(range), [range, today]);

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
    const all = recentDays(84);
    const weeks: string[][] = [];
    for (let i = 0; i < all.length; i += 7) weeks.push(all.slice(i, i + 7));
    return weeks;
  }, [today]);

  /* Sessions can all be older than the window — someone coming back after a
     term off has a history and an empty grid. */
  const calendarEmpty = useMemo(
    () => calendarWeeks.every(w => w.every(day => !(totals[day] > 0))),
    [calendarWeeks, totals]
  );

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
        <ScreenTitle>{t('stats')}</ScreenTitle>
        <Card><Empty title={t('noStatsTitle')} hint={t('noStatsHint')} /></Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScreenTitle>{t('stats')}</ScreenTitle>

      {/* Tiles rather than three columns of one card: sharing a card means the
          longest figure sets the size of all three, and "2h 30m" ends up
          rendered smaller than "7". */}
      <StatGrid>
        <Tile><Stat label={t('thisWeek')} value={dur(weekSeconds)} /></Tile>
        <Tile><Stat label={t('dailyAvg')} value={dur(Math.round(weekSeconds / 7))} /></Tile>
        <Tile>
          <Stat
            label={t('targetHit')}
            value={`${daysHit}/7`}
            tone={daysHit >= 5 ? 'good' : undefined}
          />
        </Tile>
      </StatGrid>

      <Segmented
        value={range}
        onChange={setRange}
        options={[
          { value: 7, label: t('last7'), testID: 'range-7' },
          { value: 30, label: t('last30'), testID: 'range-30' }
        ]}
        style={styles.segGap}
      />

      <Card>
        <View style={styles.chart}>
          <View style={[styles.targetLine, { bottom: (targetSeconds / peak) * CHART_HEIGHT }]} />
          {days.map((day, i) => {
            const secs = totals[day] || 0;
            const hit = secs >= targetSeconds;
            const isToday = day === today;
            /* At 30 bars there is no room for a label under each one. */
            const label = range === 7
              ? weekdayLetter(day, state.lang)
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
                      /* One hue at two strengths, not two hues: a day that hit
                         the target is the solid accent, a day that did not is
                         the same colour showing through. */
                      backgroundColor: hit ? colors.accent
                        : secs > 0 ? colors.heatMid
                        : colors.surface2
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
      <Segmented
        value={scope}
        onChange={setScope}
        options={[
          { value: 'week', label: t('thisWeek'), testID: 'scope-week' },
          { value: 'all', label: t('allTime'), testID: 'scope-all' }
        ]}
        style={styles.segGap}
      />

      <Card>
        {subjects.length === 0 && <Empty title={t('nothingAdded')} />}
        {subjects.map((subject, i) => {
          const secs = bySubject[subject.id] || 0;
          const share = scopeTotal > 0 ? secs / scopeTotal : 0;
          return (
            <View key={subject.id} style={i > 0 ? styles.subjectBlock : undefined}>
              <View style={styles.subjectHead}>
                <Dot color={subject.color} size={8} />
                <Text style={styles.subjectName}>{subject.name}</Text>
                <Text style={styles.subjectSecs}>{dur(secs)}</Text>
              </View>
              <ProgressBar value={share} color={subject.color} height={6} />
            </View>
          );
        })}
      </Card>

      <SectionTitle>{t('recentSittings')}</SectionTitle>
      <Card flush>
        {visible.map((session, i) => (
          <View key={session.id} style={[styles.sittingRow, i > 0 && styles.divider]}>
            <Dot color={subjectColor(session.subjectId)} size={8} />
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
            {/* Icons rather than the words "Edit" and "Delete": two text
                buttons on every row is more type than the row itself, and the
                labels are still there for anyone using a screen reader. */}
            <IconButton
              name="pencil"
              testID={`row-edit-${session.id}`}
              label={`${t('edit')} — ${subjectName(session.subjectId)}, ${prettyDate(session.day)}`}
              onPress={() => {
                setEditError(null);
                setEditing({
                  id: session.id,
                  minutes: String(Math.round(session.seconds / 60)),
                  date: dateInputValue(session.day),
                  subjectId: session.subjectId
                });
              }}
            />
            {/* Muted, not red. A column of six red bins down a list reads as
                six warnings; the red belongs on the confirmation, which is
                where the irreversible bit actually happens. */}
            <IconButton
              name="trash"
              testID={`row-delete-${session.id}`}
              label={`${t('delete')} — ${subjectName(session.subjectId)}, ${prettyDate(session.day)}`}
              onPress={() => setDeleting(session.id)}
            />
          </View>
        ))}
        {!showAll && recent.length > RECENT_PREVIEW && (
          <Pressable onPress={() => setShowAll(true)} style={styles.showAll} testID="show-all">
            <Text style={styles.showAllText}>{t('showAll', { n: recent.length })}</Text>
          </Pressable>
        )}
      </Card>

      <SectionTitle>{t('calendarTitle')}</SectionTitle>
      <Card>
        <View style={styles.calendar}>
          {/* The rows are fixed weekdays — 84 divides by 7, so the bottom row
              is always today's weekday and the one above it yesterday's.
              Without these letters that is true but undiscoverable, and "I
              always lose Sundays" is exactly what this grid is for. */}
          <View style={styles.calLabels}>
            {calendarWeeks[calendarWeeks.length - 1].map(day => (
              <View key={day} style={styles.calLabelCell}>
                <Text style={styles.calLabel}>{weekdayLetter(day, state.lang)}</Text>
              </View>
            ))}
          </View>
          {calendarWeeks.map((w, wi) => (
            <View key={wi} style={styles.calWeek}>
              {w.map(day => {
                const secs = totals[day] || 0;
                return (
                  <View
                    key={day}
                    style={[
                      styles.calCell,
                      { backgroundColor: heatColour(secs / targetSeconds, colors) },
                      day === today && styles.calToday
                    ]}
                  />
                );
              })}
            </View>
          ))}
        </View>

        {/* An empty grid is indistinguishable from a broken one, so when there
            is genuinely nothing in the window it says so rather than leaving
            84 identical squares under a legend about colour. */}
        {calendarEmpty ? (
          <Text style={styles.legend} testID="calendar-nothing">{t('calendarNothing')}</Text>
        ) : (
          <>
            <View style={styles.scaleRow}>
              <Text style={styles.legend}>{t('calendarLess')}</Text>
              {[0, 0.2, 0.5, 0.9, 1].map(share => (
                <View
                  key={share}
                  style={[styles.scaleCell, { backgroundColor: heatColour(share, colors) }]}
                />
              ))}
              <Text style={styles.legend}>{t('calendarMore')}</Text>
            </View>
            <Text style={styles.legend}>{t('calendarLegend')}</Text>
          </>
        )}
      </Card>

      <SectionTitle>{t('overall')}</SectionTitle>
      <StatGrid>
        <Tile><Stat label={t('phoneChecks')} value={String(totalDistractions)} /></Tile>
        <Tile><Stat label={t('focusRate')} value={cleanRoundsLabel} /></Tile>
        <Tile>
          <Stat
            label={t('bestStreak')}
            value={t(best === 1 ? 'dayUnit' : 'daysUnit', { n: best })}
          />
        </Tile>
        <Tile><Stat label={t('totalHours')} value={hours(allSeconds)} /></Tile>
        <Tile><Stat label={t('sittings')} value={String(sessions.length)} /></Tile>
      </StatGrid>

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
              if (day > today) { setEditError(t('dateInFuture')); return; }
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
function heatColour(share: number, colors: Colors): string {
  if (share <= 0) return colors.surface2;
  if (share < 0.34) return colors.heatLow;
  if (share < 0.67) return colors.heatMid;
  if (share < 1) return colors.accentGlow;
  return colors.accent;
}

const useStyles = themed((colors) => StyleSheet.create({
  content: { paddingHorizontal: SCREEN_PAD, paddingTop: space.sm, paddingBottom: 120 },
  segGap: { marginBottom: space.md },
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
    /* The legend points at this line, so it has to be visible: colors.line is
       a 1.3:1 hairline on a card and simply is not there on either ground. */
    borderColor: colors.muted,
    marginBottom: 20
  },
  barCol: { flex: 1, alignItems: 'center' },
  barValue: { ...type.caption, fontSize: 10, color: colors.muted, marginBottom: 4, height: 14 },
  bar: { width: '56%', borderRadius: radius.xs },
  barThin: { width: '68%', borderRadius: 3 },
  barLabel: { ...type.caption, fontSize: 11, color: colors.muted, marginTop: 6, height: 20 },
  barLabelToday: { color: colors.text, fontWeight: '800' },
  legend: { ...type.caption, color: colors.muted, marginTop: space.sm },

  calendar: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  /* No fixed height: the column stretches to the grid beside it, and seven
     flexed cells then land exactly on the seven rows of squares. */
  calLabels: { gap: 4, marginRight: 2 },
  calLabelCell: { flex: 1, justifyContent: 'center', minWidth: 12 },
  calLabel: { ...type.caption, fontSize: 9, color: colors.muted, textAlign: 'center' },
  calWeek: { flex: 1, gap: 4 },
  calCell: { width: '100%', aspectRatio: 1, borderRadius: 3 },
  scaleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: space.md },
  scaleCell: { width: 12, height: 12, borderRadius: 3 },
  calToday: { borderWidth: 1, borderColor: colors.text },

  subjectBlock: { marginTop: space.lg },
  subjectHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm },
  subjectName: { ...type.title, color: colors.text, flex: 1 },
  subjectSecs: { ...type.label, color: colors.muted, ...type.numeric },

  sittingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: space.lg,
    paddingRight: space.xs,
    paddingVertical: space.sm,
    gap: space.sm
  },
  divider: { borderTopWidth: hairline, borderTopColor: colors.line },
  flex: { flex: 1 },
  sittingName: { ...type.title, color: colors.text },
  sittingMeta: { ...type.caption, color: colors.muted, marginTop: 1 },
  sittingTime: { ...type.label, color: colors.text, ...type.numeric },
  showAll: { paddingVertical: space.md, alignItems: 'center', borderTopWidth: hairline, borderTopColor: colors.line },
  showAllText: { ...type.label, color: colors.accentText },

  label: { ...type.label, color: colors.muted, marginBottom: space.sm },
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
  sheetRow: { flexDirection: 'row', gap: space.md },
  chipWrapSheet: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.lg },
  error: { ...type.label, color: colors.danger, marginBottom: space.sm }
}));
