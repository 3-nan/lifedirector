import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CATEGORY_EMOJI, CATEGORY_LABEL } from '../../lib/challenges';
import { targetOf } from '../../lib/habits';
import { firstWeekMessage } from '../../lib/motivation';
import { monthKey, todayStr } from '../../lib/period';
import { supabase } from '../../lib/supabase';
import { Challenge } from '../../types/challenge';
import { Habit, Log } from '../../types/habit';

const ACCENT = '#34c759';
const DANGER = '#ff3b30';
const ACCENT_BLUE = '#007aff';
const CARD_BG = '#f7f7f8';
const MUTED = '#9a9a9e';
const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

type CompletedChallenge = {
  completed_at: string;
  challenge: Pick<Challenge, 'id' | 'title' | 'category'>;
};

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

function last7Dates(): string[] {
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

export default function ReviewScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [completedChallenges, setCompletedChallenges] = useState<CompletedChallenge[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const dates = last7Dates();
    const { data: habitsData } = await supabase
      .from('habits').select('*').eq('active', true).order('created_at', { ascending: true });
    const { data: logsData } = await supabase
      .from('logs').select('*').gte('date', dates[0]).lte('date', dates[6]);
    const { data: completedData } = await supabase
      .from('challenge_progress')
      .select('completed_at, challenge:challenges(id, title, category)')
      .eq('status', 'done')
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false });
    setHabits(habitsData ?? []);
    setLogs(logsData ?? []);
    setCompletedChallenges(
      ((completedData ?? []) as unknown as CompletedChallenge[]).filter((c) => c.challenge)
    );
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <ActivityIndicator style={styles.center} />;

  const dates = last7Dates();

  // Gemessen am eigenen Wochenziel: Gym 3/3 ist 100 %, nicht 3/7.
  const habitStats = habits.map((h) => {
    const target = targetOf(h);
    const doneCount = logs.filter((l) => l.habit_id === h.id && l.done).length;
    return { habit: h, target, rate: Math.min(1, doneCount / target), doneCount };
  }).sort((a, b) => a.rate - b.rate);

  // Erwartete Erledigungen pro Tag: ein 3×-Habit zählt mit 3/7 statt voll.
  const expectedPerDay = habits.reduce((sum, h) => sum + targetOf(h) / 7, 0);
  const weekdayStats = dates.map((date) => {
    const dayLogs = logs.filter((l) => l.date === date && l.done);
    const dayOfWeek = new Date(date).getDay();
    return {
      date,
      label: WEEKDAYS[dayOfWeek],
      rate: expectedPerDay > 0 ? Math.min(1, dayLogs.length / expectedPerDay) : 0,
    };
  });

  const weakestHabit = habitStats[0];
  const weakestDay = [...weekdayStats].sort((a, b) => a.rate - b.rate)[0];

  // In den ersten 7 Tagen nach dem ersten angelegten Habit zählen Tage davor
  // fälschlich als "verpasst" mit — da ist "schwächster Tag/Habit" noch kein
  // echtes Muster, nur fehlende Historie.
  const earliestCreatedAt = habits.length > 0
    ? Math.min(...habits.map((h) => new Date(h.created_at).getTime()))
    : null;
  const daysSinceStart = earliestCreatedAt !== null
    ? Math.floor((new Date().getTime() - earliestCreatedAt) / (24 * 3600 * 1000))
    : 0;
  const isFirstWeek = earliestCreatedAt !== null && daysSinceStart < 7;

  const currentMonth = monthKey();
  const challengesThisMonth = completedChallenges.filter(
    (c) => monthKey(new Date(c.completed_at)) === currentMonth
  ).length;

  const overallRate = habits.length > 0
    ? Math.round(
        (habitStats.reduce((sum, h) => sum + Math.min(h.doneCount, h.target), 0) /
          habitStats.reduce((sum, h) => sum + h.target, 0)) * 100
      )
    : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Wochenreview</Text>

      {habits.length === 0 ? (
        <Text style={styles.empty}>Noch keine Habits zum Auswerten.</Text>
      ) : (
        <>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: ACCENT }]}>{overallRate}%</Text>
              <Text style={styles.statLabel}>Gesamt-Rate</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{habits.length}</Text>
              <Text style={styles.statLabel}>Aktive Habits</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Pro Habit</Text>
          <View style={{ gap: 8 }}>
            {habitStats.map(({ habit, target, rate, doneCount }) => (
              <View key={habit.id} style={styles.habitCard}>
                <View style={styles.habitRowTop}>
                  <Text style={styles.habitName}>{habit.name}</Text>
                  <Text style={styles.habitCount}>{doneCount}/{target}</Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${rate * 100}%`, backgroundColor: rate < 0.5 ? DANGER : ACCENT }]} />
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Pro Wochentag</Text>
          <View style={styles.weekCard}>
            <View style={styles.weekRow}>
              {weekdayStats.map((d) => (
                <View key={d.date} style={styles.dayCol}>
                  <View style={styles.dayBarTrack}>
                    <View style={[styles.dayBarFill, { height: `${Math.max(d.rate * 100, 4)}%` }]} />
                  </View>
                  <Text style={styles.dayLabel}>{d.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>Optimierungs-Hinweis</Text>
            {isFirstWeek ? (
              <Text style={styles.insightText}>{firstWeekMessage(todayStr())}</Text>
            ) : (
              <>
                {weakestHabit && weakestHabit.rate < 1 && (
                  <Text style={styles.insightText}>
                    „{weakestHabit.habit.name}“ lag diese Woche am weitesten hinter seinem Ziel ({weakestHabit.doneCount}/{weakestHabit.target}). Lohnt sich, die Einheit kleiner zu schneiden.
                  </Text>
                )}
                {weakestDay && weakestDay.rate < 1 && (
                  <Text style={styles.insightText}>
                    {weakestDay.label} ist bisher dein schwächster Tag.
                  </Text>
                )}
              </>
            )}
          </View>
        </>
      )}

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Gemeisterte Challenges</Text>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: ACCENT }]}>{completedChallenges.length}</Text>
          <Text style={styles.statLabel}>Insgesamt</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{challengesThisMonth}</Text>
          <Text style={styles.statLabel}>Diesen Monat</Text>
        </View>
      </View>
      <View style={{ gap: 8 }}>
        {completedChallenges.map(({ completed_at, challenge }) => (
          <View key={challenge.id} style={styles.challengeRow}>
            <Text style={styles.challengeEmoji}>{CATEGORY_EMOJI[challenge.category]}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.habitName}>{challenge.title}</Text>
              <Text style={styles.challengeMeta}>
                {CATEGORY_LABEL[challenge.category]} · {formatDateShort(completed_at)}
              </Text>
            </View>
          </View>
        ))}
        {completedChallenges.length === 0 && (
          <Text style={styles.emptyInline}>
            Noch keine Challenge abgeschlossen — zieh dir eine im Challenges-Tab.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Abstände im Inhalt statt am ScrollView selbst — sonst schneidet Android unten ab.
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center' },
  header: { fontSize: 22, fontWeight: '600', marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: CARD_BG, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '600' },
  statLabel: { fontSize: 11, color: MUTED, marginTop: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: MUTED, marginBottom: 10, marginTop: 4 },
  habitCard: { backgroundColor: CARD_BG, borderRadius: 10, padding: 14 },
  habitRowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  habitName: { fontSize: 14 },
  habitCount: { fontSize: 12, color: MUTED },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: '#e5e5e7', overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  weekCard: { backgroundColor: CARD_BG, borderRadius: 10, padding: 16, marginBottom: 8 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', height: 90, alignItems: 'flex-end' },
  dayCol: { alignItems: 'center', flex: 1 },
  dayBarTrack: { width: 16, height: 64, justifyContent: 'flex-end' },
  dayBarFill: { width: 16, backgroundColor: ACCENT_BLUE, borderRadius: 5 },
  dayLabel: { fontSize: 11, color: MUTED, marginTop: 6 },
  insightCard: { backgroundColor: CARD_BG, borderRadius: 10, padding: 16, marginTop: 20 },
  insightTitle: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  insightText: { fontSize: 13, color: '#555', lineHeight: 19, marginBottom: 6 },
  empty: { color: MUTED, marginTop: 20 },
  emptyInline: { color: MUTED },
  challengeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: CARD_BG, borderRadius: 10, padding: 14 },
  challengeEmoji: { fontSize: 20 },
  challengeMeta: { fontSize: 12, color: MUTED, marginTop: 2 },
});