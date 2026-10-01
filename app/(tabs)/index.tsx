import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { setupDailyReminder } from '../../lib/notifications';
import { supabase } from '../../lib/supabase';
import { Habit } from '../../types/habit';


const ACCENT = '#34c759';
const CARD_BG = '#f7f7f8';
const MUTED = '#9a9a9e';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateDE(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  const d = new Date(isoDate);
  const weekdays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  return `${weekdays[d.getDay()]}, ${day}. ${month}.`;
}

export default function TodayScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [doneMap, setDoneMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: habitsData } = await supabase
      .from('habits').select('*').eq('active', true).order('sort_order', { ascending: true });
    const { data: logsData } = await supabase
      .from('logs').select('habit_id, done').eq('date', todayStr());

    const map: Record<string, boolean> = {};
    logsData?.forEach((l) => { map[l.habit_id] = l.done; });

    setHabits(habitsData ?? []);
    setDoneMap(map);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    setupDailyReminder();
  }, []);

  async function toggle(habitId: string) {
    const newDone = !doneMap[habitId];
    setDoneMap((prev) => ({ ...prev, [habitId]: newDone }));
    await supabase.from('logs').upsert(
      { habit_id: habitId, date: todayStr(), done: newDone },
      { onConflict: 'habit_id,date' }
    );
  }

  if (loading) return <ActivityIndicator style={styles.center} />;

  const doneCount = habits.filter((h) => doneMap[h.id]).length;

  return (
    <View style={styles.container}>
      <Text style={styles.dateLabel}>{formatDateDE(todayStr())}</Text>
      <Text style={styles.header}>Heute</Text>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: ACCENT }]}>{doneCount}</Text>
          <Text style={styles.statLabel}>Erledigt</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{doneCount}/{habits.length}</Text>
          <Text style={styles.statLabel}>Heute</Text>
        </View>
      </View>

      <FlatList
        data={habits}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 8 }}
        ListEmptyComponent={<Text style={styles.empty}>Noch keine Habits angelegt.</Text>}
        renderItem={({ item }) => {
          const checked = !!doneMap[item.id];
          return (
            <TouchableOpacity style={styles.card} onPress={() => toggle(item.id)} activeOpacity={0.7}>
              <View style={[styles.checkCircle, checked && styles.checkCircleDone]}>
                {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={[styles.label, checked && styles.labelDone]}>{item.name}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center' },
  dateLabel: { fontSize: 13, color: MUTED, marginBottom: 2 },
  header: { fontSize: 22, fontWeight: '600', marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: CARD_BG, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '600' },
  statLabel: { fontSize: 11, color: MUTED, marginTop: 2 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: CARD_BG, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 14 },
  checkCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#c7c7cc', justifyContent: 'center', alignItems: 'center' },
  checkCircleDone: { backgroundColor: ACCENT, borderColor: ACCENT },
  label: { fontSize: 15 },
  labelDone: { color: MUTED, textDecorationLine: 'line-through' },
  empty: { color: MUTED, marginTop: 20 },
});