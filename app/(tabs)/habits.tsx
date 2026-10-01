import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Habit } from '../../types/habit';

const ACCENT = '#34c759';
const CARD_BG = '#f7f7f8';
const MUTED = '#9a9a9e';
const DANGER = '#ff3b30';

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
    const { error } = await supabase.from('habits').insert({ name });
    setAdding(false);
    if (error) { Alert.alert('Fehler', error.message); return; }
    setNewName('');
    load();
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

      <FlatList
        data={habits}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 8 }}
        ListEmptyComponent={<Text style={styles.empty}>Noch keine Habits. Leg oben deinen ersten an.</Text>}
        renderItem={({ item, index }) => (
            <View style={styles.card}>
                <Text style={styles.label}>{item.name}</Text>
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
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center' },
  header: { fontSize: 22, fontWeight: '600', marginBottom: 20 },
  addCard: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  input: { flex: 1, backgroundColor: CARD_BG, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  addButton: { backgroundColor: ACCENT, width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: CARD_BG, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 14 },
  label: { fontSize: 15 },
  empty: { color: MUTED, marginTop: 20 },
});