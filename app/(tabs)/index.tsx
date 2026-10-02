import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CATEGORY_EMOJI, CATEGORY_LABEL, CATEGORY_ROTATION } from '../../lib/challenges';
import { setupDailyReminder } from '../../lib/notifications';
import { isoWeekKey } from '../../lib/period';
import { supabase } from '../../lib/supabase';
import { ChallengeCategory } from '../../types/challenge';
import { Habit } from '../../types/habit';
import { Task } from '../../types/task';


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

function promptCategory(onPick: (category: ChallengeCategory) => void) {
  Alert.alert(
    'Kategorie wählen',
    undefined,
    [
      ...CATEGORY_ROTATION.map((cat) => ({
        text: `${CATEGORY_EMOJI[cat]} ${CATEGORY_LABEL[cat]}`,
        onPress: () => onPick(cat),
      })),
      { text: 'Abbrechen', style: 'cancel' as const },
    ]
  );
}

export default function TodayScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [doneMap, setDoneMap] = useState<Record<string, boolean>>({});
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: habitsData } = await supabase
      .from('habits').select('*').eq('active', true).order('sort_order', { ascending: true });
    const { data: logsData } = await supabase
      .from('logs').select('habit_id, done').eq('date', todayStr());
    const { data: tasksData } = await supabase
      .from('tasks').select('*').eq('week_key', isoWeekKey()).order('created_at', { ascending: true });

    const map: Record<string, boolean> = {};
    logsData?.forEach((l) => { map[l.habit_id] = l.done; });

    setHabits(habitsData ?? []);
    setDoneMap(map);
    setTasks(tasksData ?? []);
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

  async function toggleTask(task: Task) {
    const newDone = !task.done;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: newDone } : t)));
    await supabase.from('tasks').update({
      done: newDone,
      completed_at: newDone ? new Date().toISOString() : null,
    }).eq('id', task.id);
  }

  function addTask() {
    const title = newTaskTitle.trim();
    if (!title) return;
    promptCategory(async (category) => {
      setAddingTask(true);
      const { error } = await supabase.from('tasks').insert({ title, category, week_key: isoWeekKey() });
      setAddingTask(false);
      if (error) { Alert.alert('Fehler', error.message); return; }
      setNewTaskTitle('');
      load();
    });
  }

  if (loading) return <ActivityIndicator style={styles.center} />;

  const doneCount = habits.filter((h) => doneMap[h.id]).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
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

      <Text style={styles.sectionTitle}>Diese Woche</Text>
      <View style={{ gap: 8, marginBottom: 20 }}>
        {tasks.map((item) => {
          const checked = item.done;
          return (
            <TouchableOpacity key={item.id} style={styles.card} onPress={() => toggleTask(item)} activeOpacity={0.7}>
              <View style={[styles.checkCircle, checked && styles.checkCircleDone]}>
                {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, checked && styles.labelDone]}>{item.title}</Text>
                <View style={styles.badgeRow}>
                  <Text style={styles.badge}>{CATEGORY_EMOJI[item.category]} {CATEGORY_LABEL[item.category]}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
        {tasks.length === 0 && <Text style={styles.empty}>Noch kein Task für diese Woche.</Text>}

        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            placeholder="Neuer Task diese Woche…"
            placeholderTextColor={MUTED}
            value={newTaskTitle}
            onChangeText={setNewTaskTitle}
            onSubmitEditing={addTask}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.addButton} onPress={addTask} disabled={addingTask} activeOpacity={0.7}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Gewohnheiten</Text>
      <View style={{ gap: 8 }}>
        {habits.map((item) => {
          const checked = !!doneMap[item.id];
          return (
            <TouchableOpacity key={item.id} style={styles.card} onPress={() => toggle(item.id)} activeOpacity={0.7}>
              <View style={[styles.checkCircle, checked && styles.checkCircleDone]}>
                {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={[styles.label, checked && styles.labelDone]}>{item.name}</Text>
            </TouchableOpacity>
          );
        })}
        {habits.length === 0 && <Text style={styles.empty}>Noch keine Habits angelegt.</Text>}
      </View>
    </ScrollView>
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
  sectionTitle: { fontSize: 13, fontWeight: '600', color: MUTED, marginBottom: 10 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: CARD_BG, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 14 },
  checkCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#c7c7cc', justifyContent: 'center', alignItems: 'center' },
  checkCircleDone: { backgroundColor: ACCENT, borderColor: ACCENT },
  label: { fontSize: 15 },
  labelDone: { color: MUTED, textDecorationLine: 'line-through' },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  badge: { fontSize: 11, color: MUTED, backgroundColor: '#ececee', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  addRow: { flexDirection: 'row', gap: 8 },
  addInput: { flex: 1, backgroundColor: CARD_BG, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  addButton: { backgroundColor: ACCENT, width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  empty: { color: MUTED, marginTop: 4, marginBottom: 4 },
});
