import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { DAILY_TARGET, FREQUENCY_OPTIONS, frequencyChipLabel, frequencyLabel, targetOf } from '../../lib/habits';
import { supabase } from '../../lib/supabase';
import { Habit } from '../../types/habit';
import { ACCENT, BLUE, CARD_BG, DANGER, MUTED } from '../../constants/theme';

function FrequencyChips({ value, onChange }: { value: number; onChange: (target: number) => void }) {
  return (
    <View style={styles.chipRow}>
      {FREQUENCY_OPTIONS.map((option) => {
        const selected = option === value;
        return (
          <TouchableOpacity
            key={option}
            style={[styles.chip, selected && styles.chipSelected]}
            onPress={() => onChange(option)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{frequencyChipLabel(option)}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

async function moveHabit(habits: Habit[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= habits.length) return habits;
  const reordered = [...habits];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

  await Promise.all(
    reordered.map((h, i) =>
      supabase.from('habits').update({ sort_order: i }).eq('id', h.id)
    )
  );
  return reordered;
}

export default function HabitsScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [newTarget, setNewTarget] = useState<number>(DAILY_TARGET);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
        .from('habits').select('*').eq('active', true).order('sort_order', { ascending: true });
    setHabits(data ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function addHabit() {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    const { error } = await supabase.from('habits').insert({ name, target_per_week: newTarget });
    setAdding(false);
    if (error) { Alert.alert('Fehler', error.message); return; }
    setNewName('');
    setNewTarget(DAILY_TARGET);
    load();
  }

  async function changeTarget(habit: Habit, target: number) {
    const previous = targetOf(habit);
    setEditingId(null);
    setHabits((prev) => prev.map((h) => (h.id === habit.id ? { ...h, target_per_week: target } : h)));
    const { error } = await supabase.from('habits').update({ target_per_week: target }).eq('id', habit.id);
    if (error) {
      setHabits((prev) => prev.map((h) => (h.id === habit.id ? { ...h, target_per_week: previous } : h)));
      Alert.alert('Fehler', error.message);
    }
  }

  function confirmDelete(habit: Habit) {
    Alert.alert(
      'Habit löschen?',
      `"${habit.name}" wird deaktiviert. Bisherige Logs bleiben erhalten.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen', style: 'destructive',
          onPress: async () => {
            await supabase.from('habits').update({ active: false }).eq('id', habit.id);
            load();
          },
        },
      ]
    );
  }

  if (loading) return <ActivityIndicator style={styles.center} />;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Habits</Text>

      <View style={styles.addCard}>
        <TextInput
          style={styles.input}
          placeholder="Neuer Habit..."
          placeholderTextColor={MUTED}
          value={newName}
          onChangeText={setNewName}
          onSubmitEditing={addHabit}
          returnKeyType="done"
        />
        <TouchableOpacity style={styles.addButton} onPress={addHabit} disabled={adding} activeOpacity={0.7}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
      <View style={styles.newFrequency}>
        <FrequencyChips value={newTarget} onChange={setNewTarget} />
      </View>

      <FlatList
        data={habits}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 8 }}
        ListEmptyComponent={<Text style={styles.empty}>Noch keine Habits. Leg oben deinen ersten an.</Text>}
        renderItem={({ item, index }) => (
          <View style={styles.cardWrap}>
            <View style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{item.name}</Text>
                  <TouchableOpacity
                    onPress={() => setEditingId(editingId === item.id ? null : item.id)}
                    hitSlop={8}
                    style={styles.frequencyButton}
                  >
                    <Text style={styles.frequencyText}>{frequencyLabel(targetOf(item))}</Text>
                    <Ionicons name={editingId === item.id ? 'chevron-up' : 'chevron-down'} size={12} color="#007aff" />
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                <TouchableOpacity onPress={async () => setHabits(await moveHabit(habits, index, -1))} hitSlop={10}>
                    <Ionicons name="chevron-up" size={18} color={index === 0 ? '#ddd' : MUTED} />
                </TouchableOpacity>
                <TouchableOpacity onPress={async () => setHabits(await moveHabit(habits, index, 1))} hitSlop={10}>
                    <Ionicons name="chevron-down" size={18} color={index === habits.length - 1 ? '#ddd' : MUTED} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmDelete(item)} hitSlop={10}>
                    <Ionicons name="trash-outline" size={18} color={DANGER} />
                </TouchableOpacity>
                </View>
            </View>
            {editingId === item.id && (
              <View style={styles.editChips}>
                <FrequencyChips value={targetOf(item)} onChange={(target) => changeTarget(item, target)} />
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center' },
  header: { fontSize: 22, fontWeight: '600', marginBottom: 20 },
  addCard: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  newFrequency: { marginBottom: 20 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: '#ececee', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  chipSelected: { backgroundColor: ACCENT },
  chipText: { fontSize: 13, color: '#555' },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  cardWrap: { backgroundColor: CARD_BG, borderRadius: 10 },
  editChips: { paddingHorizontal: 14, paddingBottom: 14 },
  frequencyButton: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3, alignSelf: 'flex-start' },
  frequencyText: { fontSize: 12, color: BLUE },
  input: { flex: 1, backgroundColor: CARD_BG, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  addButton: { backgroundColor: ACCENT, width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: CARD_BG, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 14 },
  label: { fontSize: 15 },
  empty: { color: MUTED, marginTop: 20 },
});