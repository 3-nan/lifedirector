import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Habit, Log } from '../../types/habit';

const ACCENT = '#34c759';
const DANGER = '#ff3b30';
const ACCENT_BLUE = '#007aff';
const CARD_BG = '#f7f7f8';
const MUTED = '#9a9a9e';
const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

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
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const dates = last7Dates();
    const { data: habitsData } = await supabase
      .from('habits').select('*').eq('active', true).order('created_at', { ascending: true });
    const { data: logsData } = await supabase
      .from('logs').select('*').gte('date', dates[0]).lte('date', dates[6]);
    setHabits(habitsData ?? []);
    setLogs(logsData ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <ActivityIndicator style={styles.center} />;

  const dates = last7Dates();

  const habitStats = habits.map((h) => {
    const doneCount = logs.filter((l) => l.habit_id === h.id && l.done).length;
    return { habit: h, rate: doneCount / 7, doneCount };
  }).sort((a, b) => a.rate - b.rate);

  const weekdayStats = dates.map((date) => {
    const dayLogs = logs.filter((l) => l.date === date && l.done);
    const dayOfWeek = new Date(date).getDay();
    const total = habits.length;
    return { date, label: WEEKDAYS[dayOfWeek], rate: total > 0 ? dayLogs.length / total : 0 };
  });

  const weakestHabit = habitStats[0];
  const weakestDay = [...weekdayStats].sort((a, b) => a.rate - b.rate)[0];
  const overallRate = habits.length > 0
    ? Math.round((habitStats.reduce((sum, h) => sum + h.doneCount, 0) / (habits.length * 7)) * 100)
    : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
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
            {habitStats.map(({ habit, rate, doneCount }) => (
              <View key={habit.id} style={styles.habitCard}>
                <View style={styles.habitRowTop}>
                  <Text style={styles.habitName}>{habit.name}</Text>
                  <Text style={styles.habitCount}>{doneCount}/7</Text>
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
            {weakestHabit && weakestHabit.rate < 1 && (
              <Text style={styles.insightText}>
                "{weakestHabit.habit.name}" lief diese Woche am wenigsten ({weakestHabit.doneCount}/7). Lohnt sich, die Einheit kleiner zu schneiden.
              </Text>
            )}
            {weakestDay && weakestDay.rate < 1 && (
              <Text style={styles.insightText}>
                {weakestDay.label} ist bisher dein schwächster Tag.
              </Text>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60, backgroundColor: '#fff' },
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
});