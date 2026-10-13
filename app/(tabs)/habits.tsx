import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  DAILY_TARGET, DoneLog, FREQUENCY_OPTIONS, HABIT_EMOJIS, doneDatesByHabit, fetchDoneLogs, frequencyChipLabel,
  frequencyLabel, habitColor, habitEmoji, habitStage, isDaily, targetOf,
} from '../../lib/habits';
import {
  bestStreak, bestWeekStreak, computeMomentum, computeStreak, computeWeekMomentum, computeWeekStreak, doneThisWeek,
  momentumNote,
} from '../../lib/motivation';
import { KeyboardAwareScroll } from '../../components/keyboard-aware';
import { OfflineBanner } from '../../components/offline-banner';
import { cached } from '../../lib/offline';
import { supabase } from '../../lib/supabase';
import { Habit } from '../../types/habit';
import { ACCENT, BLUE, CARD_BG, DANGER, MUTED, MUTED_TEXT, TEXT } from '../../constants/theme';

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

function EmojiChips({ value, onChange }: { value: string; onChange: (emoji: string) => void }) {
  return (
    <View style={styles.emojiRow}>
      {HABIT_EMOJIS.map((emoji) => (
        <TouchableOpacity
          key={emoji}
          style={[styles.emojiChip, emoji === value && styles.emojiChipSelected]}
          onPress={() => onChange(emoji)}
          activeOpacity={0.7}
        >
          <Text style={styles.emojiChipText}>{emoji}</Text>
        </TouchableOpacity>
      ))}
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

function unit(count: number, daily: boolean): string {
  if (daily) return count === 1 ? 'Tag' : 'Tage';
  return count === 1 ? 'Woche' : 'Wochen';
}

type Expanded = { id: string; kind: 'frequency' | 'emoji' } | null;

export default function HabitsScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [doneDates, setDoneDates] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState<Expanded>(null);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState(HABIT_EMOJIS[0]);
  const [newTarget, setNewTarget] = useState<number>(DAILY_TARGET);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await cached<Habit[]>('habits:list', () =>
      supabase.from('habits').select('*').eq('active', true).order('sort_order', { ascending: true }));
    const logs = await cached<DoneLog[]>('habits:doneLogs', fetchDoneLogs);
    setHabits(data ?? []);
    setDoneDates(doneDatesByHabit(logs ?? []));
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function addHabit() {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    const { error } = await supabase.from('habits').insert({ name, icon: newEmoji, target_per_week: newTarget });
    setAdding(false);
    if (error) { Alert.alert('Fehler', error.message); return; }
    setNewName('');
    setNewEmoji(HABIT_EMOJIS[0]);
    setNewTarget(DAILY_TARGET);
    setShowForm(false);
    load();
  }

  async function updateHabit(habit: Habit, patch: Partial<Pick<Habit, 'icon' | 'target_per_week'>>) {
    setExpanded(null);
    setHabits((prev) => prev.map((h) => (h.id === habit.id ? { ...h, ...patch } : h)));
    const { error } = await supabase.from('habits').update(patch).eq('id', habit.id);
    if (error) {
      setHabits((prev) => prev.map((h) => (h.id === habit.id ? habit : h)));
      Alert.alert('Fehler', error.message);
    }
  }

  function toggleExpanded(id: string, kind: 'frequency' | 'emoji') {
    setExpanded(expanded?.id === id && expanded.kind === kind ? null : { id, kind });
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

  const totalDone = habits.reduce((sum, h) => sum + (doneDates[h.id]?.size ?? 0), 0);

  return (
    <KeyboardAwareScroll style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Habits</Text>
        {habits.length > 0 && (
          <TouchableOpacity onPress={() => { setEditing(!editing); setExpanded(null); }} hitSlop={10}>
            <Text style={styles.headerLink}>{editing ? 'Fertig' : 'Bearbeiten'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {habits.length > 0 && (
        <Text style={styles.subHeader}>
          {habits.length} {habits.length === 1 ? 'Gewohnheit' : 'Gewohnheiten'} · {totalDone} Haken seit dem Start
        </Text>
      )}
      <OfflineBanner />

      <View style={{ gap: 10 }}>
        {habits.map((habit, index) => {
          const dates = doneDates[habit.id] ?? new Set<string>();
          const target = targetOf(habit);
          const daily = isDaily(target);
          const color = habitColor(habit);
          const total = dates.size;
          const stage = habitStage(total);
          const createdAt = new Date(habit.created_at);
          const streak = daily ? computeStreak(dates) : computeWeekStreak(dates, target);
          const best = daily ? bestStreak(dates) : bestWeekStreak(dates, target);
          const momentum = daily ? computeMomentum(dates, createdAt) : computeWeekMomentum(dates, target, createdAt);
          const note = momentumNote(streak, momentum, daily ? 'day' : 'week');
          const meta = daily
            ? `Täglich · ${total}× gemacht`
            : `${frequencyLabel(target)} · ${doneThisWeek(dates)}/${target} diese Woche`;
          const footLeft = note ?? (best > 0 ? `Beste Serie: ${best} ${unit(best, daily)}` : `${total}× gemacht`);
          const isExpanded = (kind: 'frequency' | 'emoji') => expanded?.id === habit.id && expanded.kind === kind;

          return (
            <View key={habit.id} style={styles.card}>
              <View style={styles.cardTop}>
                <TouchableOpacity
                  style={[styles.tile, { backgroundColor: color.bg }]}
                  onPress={() => toggleExpanded(habit.id, 'emoji')}
                  disabled={!editing}
                  activeOpacity={0.7}
                >
                  <Text style={styles.tileEmoji}>{habitEmoji(habit)}</Text>
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{habit.name}</Text>
                  {editing ? (
                    <TouchableOpacity onPress={() => toggleExpanded(habit.id, 'frequency')} hitSlop={8} style={styles.frequencyButton}>
                      <Text style={styles.frequencyText}>{frequencyLabel(target)}</Text>
                      <Ionicons name={isExpanded('frequency') ? 'chevron-up' : 'chevron-down'} size={12} color={BLUE} />
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.meta}>{meta}</Text>
                  )}
                </View>
                {editing ? (
                  <View style={styles.editIcons}>
                    <TouchableOpacity onPress={async () => setHabits(await moveHabit(habits, index, -1))} hitSlop={10}>
                      <Ionicons name="chevron-up" size={18} color={index === 0 ? '#ddd' : MUTED} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={async () => setHabits(await moveHabit(habits, index, 1))} hitSlop={10}>
                      <Ionicons name="chevron-down" size={18} color={index === habits.length - 1 ? '#ddd' : MUTED} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => confirmDelete(habit)} hitSlop={10}>
                      <Ionicons name="trash-outline" size={18} color={DANGER} />
                    </TouchableOpacity>
                  </View>
                ) : streak > 0 ? (
                  <Text style={[styles.pill, { backgroundColor: color.bg, color: color.text }]}>🔥 {streak} {unit(streak, daily)}</Text>
                ) : momentum > 0 ? (
                  <Text style={[styles.pill, { backgroundColor: color.bg, color: color.text }]}>Momentum {momentum}</Text>
                ) : null}
              </View>

              {editing && isExpanded('emoji') && (
                <EmojiChips value={habitEmoji(habit)} onChange={(icon) => updateHabit(habit, { icon })} />
              )}
              {editing && isExpanded('frequency') && (
                <FrequencyChips value={target} onChange={(t) => updateHabit(habit, { target_per_week: t })} />
              )}

              {!editing && (
                <View style={styles.foot}>
                  <Text style={styles.footText} numberOfLines={1}>{footLeft}</Text>
                  <View style={styles.stage}>
                    <Text style={styles.footText}>{stage.emoji} {stage.label}</Text>
                    <View style={styles.stageTrack}>
                      <View style={[styles.stageFill, { width: `${Math.max(stage.progress * 100, 4)}%`, backgroundColor: color.accent }]} />
                    </View>
                  </View>
                </View>
              )}
            </View>
          );
        })}

        {habits.length === 0 && !showForm && (
          <Text style={styles.empty}>Noch keine Habits. Leg deinen ersten an — klein anfangen reicht.</Text>
        )}

        {showForm ? (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Neuer Habit</Text>
            <EmojiChips value={newEmoji} onChange={setNewEmoji} />
            <TextInput
              style={styles.input}
              placeholder="z.B. Wasser trinken"
              placeholderTextColor={MUTED}
              value={newName}
              onChangeText={setNewName}
              onSubmitEditing={addHabit}
              returnKeyType="done"
              autoFocus
            />
            <FrequencyChips value={newTarget} onChange={setNewTarget} />
            <View style={styles.formActions}>
              <TouchableOpacity onPress={() => setShowForm(false)} hitSlop={8}>
                <Text style={styles.cancel}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addButton, !newName.trim() && { opacity: 0.5 }]}
                onPress={addHabit}
                disabled={adding || !newName.trim()}
                activeOpacity={0.7}
              >
                <Text style={styles.addButtonText}>Anlegen</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.newButton} onPress={() => { setShowForm(true); setEditing(false); }} activeOpacity={0.7}>
            <Ionicons name="add" size={18} color={BLUE} />
            <Text style={styles.newButtonText}>Neuer Habit</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAwareScroll>
  );
}

const styles = StyleSheet.create({
  // Abstände im Inhalt statt am ScrollView selbst — sonst schneidet Android unten ab.
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  header: { fontSize: 22, fontWeight: '600' },
  headerLink: { fontSize: 15, color: BLUE },
  subHeader: { fontSize: 13, color: MUTED_TEXT, marginBottom: 18 },
  card: { backgroundColor: CARD_BG, borderRadius: 14, padding: 12, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tile: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  tileEmoji: { fontSize: 22 },
  name: { fontSize: 16, fontWeight: '600', color: TEXT },
  meta: { fontSize: 12.5, color: MUTED_TEXT, marginTop: 2 },
  pill: { fontSize: 12, fontWeight: '700', borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4, overflow: 'hidden' },
  editIcons: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  frequencyButton: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3, alignSelf: 'flex-start' },
  frequencyText: { fontSize: 12.5, color: BLUE },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  footText: { fontSize: 12, color: MUTED_TEXT, flexShrink: 1 },
  stage: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stageTrack: { width: 60, height: 5, borderRadius: 3, backgroundColor: '#e5e5e7', overflow: 'hidden' },
  stageFill: { height: 5, borderRadius: 3 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: '#ececee', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  chipSelected: { backgroundColor: ACCENT },
  chipText: { fontSize: 13, color: '#555' },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  emojiChip: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  emojiChipSelected: { backgroundColor: '#e3f7e8', borderWidth: 2, borderColor: ACCENT },
  emojiChipText: { fontSize: 19 },
  form: { backgroundColor: CARD_BG, borderRadius: 14, padding: 12, gap: 12, borderWidth: 1.5, borderColor: ACCENT },
  formTitle: { fontSize: 15, fontWeight: '600' },
  input: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 18 },
  cancel: { fontSize: 14, color: MUTED_TEXT },
  addButton: { backgroundColor: ACCENT, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  newButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#c7c7cc', borderRadius: 14, paddingVertical: 14 },
  newButtonText: { fontSize: 15, fontWeight: '600', color: BLUE },
  empty: { color: MUTED, marginBottom: 4 },
});
