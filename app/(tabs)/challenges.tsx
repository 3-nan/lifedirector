import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScroll } from '../../components/keyboard-aware';
import {
    CATEGORY_EMOJI,
    CATEGORY_LABEL,
    currentMonthCategory,
    drawChallenge,
    finishChallenge,
    SIZE_LABEL,
    SIZE_ORDER,
    startChallenge,
} from '../../lib/challenges';
import { monthKey } from '../../lib/period';
import { supabase } from '../../lib/supabase';
import { Challenge } from '../../types/challenge';
import { MonthlyGoal } from '../../types/monthlyGoal';
import { ACCENT, BLUE, CARD_BG, MUTED } from '../../constants/theme';

// 'done' = gerade nicht aktiv, aber schon mindestens einmal geschafft.
type CardState = 'open' | 'active' | 'done';
const STATUS_ICON: Record<CardState, keyof typeof Ionicons.glyphMap> = {
  open: 'ellipse-outline',
  active: 'play-circle',
  done: 'checkmark-circle',
};
const STATUS_COLOR: Record<CardState, string> = {
  open: '#c7c7cc',
  active: BLUE,
  done: ACCENT,
};

export default function ChallengesScreen() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set());
  const [doneCounts, setDoneCounts] = useState<Record<string, number>>({});
  const [goals, setGoals] = useState<MonthlyGoal[]>([]);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [addingGoal, setAddingGoal] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: challengeData } = await supabase
      .from('challenges').select('*').eq('active', true).order('created_at', { ascending: true });
    const { data: progressData } = await supabase
      .from('challenge_progress').select('challenge_id, status');
    const { data: goalData } = await supabase
      .from('monthly_goals').select('*').eq('month_key', monthKey()).order('created_at', { ascending: true });

    // Eine Zeile pro Durchgang: aktive merken, geschaffte zählen.
    const active = new Set<string>();
    const counts: Record<string, number> = {};
    progressData?.forEach((p) => {
      if (p.status === 'active') active.add(p.challenge_id);
      if (p.status === 'done') counts[p.challenge_id] = (counts[p.challenge_id] ?? 0) + 1;
    });

    setChallenges(challengeData ?? []);
    setActiveIds(active);
    setDoneCounts(counts);
    setGoals(goalData ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const isActive = useCallback((id: string) => activeIds.has(id), [activeIds]);

  async function start(challenge: Challenge) {
    setActiveIds((prev) => new Set(prev).add(challenge.id));
    const { error } = await startChallenge(challenge.id);
    if (error) { Alert.alert('Fehler', error.message); load(); }
  }

  async function finish(challenge: Challenge, status: 'done' | 'open') {
    setActiveIds((prev) => { const next = new Set(prev); next.delete(challenge.id); return next; });
    if (status === 'done') setDoneCounts((prev) => ({ ...prev, [challenge.id]: (prev[challenge.id] ?? 0) + 1 }));
    const { error } = await finishChallenge(challenge.id, status);
    if (error) { Alert.alert('Fehler', error.message); load(); }
  }

  function confirmCancel(challenge: Challenge) {
    Alert.alert('Challenge abbrechen?', challenge.title, [
      { text: 'Weiterlaufen lassen', style: 'cancel' },
      { text: 'Abbrechen', style: 'destructive', onPress: () => finish(challenge, 'open') },
    ]);
  }

  const monthCategory = useMemo(() => currentMonthCategory(), []);

  function handleDraw() {
    const picked = drawChallenge(challenges, isActive, monthCategory);
    if (!picked) {
      Alert.alert('Alles läuft schon 🎉', 'Gerade sind alle Challenges aktiv.');
      return;
    }
    const times = doneCounts[picked.id] ?? 0;
    Alert.alert(
      `${CATEGORY_EMOJI[picked.category]} ${picked.title}`,
      [picked.description, times > 0 ? `Schon ${times}× geschafft – nochmal?` : null]
        .filter(Boolean).join('\n\n') || 'Los geht\'s?',
      [
        { text: 'Später', style: 'cancel' },
        { text: "Los geht's", onPress: () => start(picked) },
      ]
    );
  }

  async function toggleGoal(goal: MonthlyGoal) {
    const newDone = !goal.done;
    setGoals((prev) => prev.map((g) => (g.id === goal.id ? { ...g, done: newDone } : g)));
    await supabase.from('monthly_goals').update({
      done: newDone,
      completed_at: newDone ? new Date().toISOString() : null,
    }).eq('id', goal.id);
  }

  async function addGoal() {
    const title = newGoalTitle.trim();
    if (!title) return;
    setAddingGoal(true);
    const { error } = await supabase.from('monthly_goals').insert({ title, month_key: monthKey() });
    setAddingGoal(false);
    if (error) { Alert.alert('Fehler', error.message); return; }
    setNewGoalTitle('');
    load();
  }

  // Jeder Durchgang zählt, auch wiederholte Challenges.
  const doneCount = Object.values(doneCounts).reduce((sum, n) => sum + n, 0);
  const activeCount = challenges.filter((c) => isActive(c.id)).length;

  if (loading) return <ActivityIndicator style={styles.center} />;

  return (
    <KeyboardAwareScroll style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Challenges</Text>

      <View style={styles.monthCard}>
        <Text style={styles.monthLabel}>Kategorie diesen Monat</Text>
        <Text style={styles.monthValue}>{CATEGORY_EMOJI[monthCategory]} {CATEGORY_LABEL[monthCategory]}</Text>
        <TouchableOpacity style={styles.drawButton} onPress={handleDraw} activeOpacity={0.8}>
          <Ionicons name="shuffle" size={18} color="#fff" />
          <Text style={styles.drawButtonText}>Challenge ziehen</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: ACCENT }]}>{doneCount}</Text>
          <Text style={styles.statLabel}>Erledigt</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: BLUE }]}>{activeCount}</Text>
          <Text style={styles.statLabel}>Aktiv</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{challenges.length}</Text>
          <Text style={styles.statLabel}>Gesamt</Text>
        </View>
      </View>

      <View style={styles.tintedSection}>
        <Text style={styles.sectionTitle}>Monatsziele</Text>
        <View style={{ gap: 8, marginBottom: 12 }}>
          {goals.map((goal) => {
            const checked = goal.done;
            return (
              <TouchableOpacity
                key={goal.id}
                style={styles.goalCard}
                onPress={() => toggleGoal(goal)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={checked ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={checked ? ACCENT : '#c7c7cc'}
                />
                <Text style={[styles.cardTitle, checked && styles.cardTitleDone]}>{goal.title}</Text>
              </TouchableOpacity>
            );
          })}
          {goals.length === 0 && <Text style={styles.empty}>Noch kein Monatsziel eingetragen.</Text>}

          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              placeholder="Neues Monatsziel…"
              placeholderTextColor={MUTED}
              value={newGoalTitle}
              onChangeText={setNewGoalTitle}
              onSubmitEditing={addGoal}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addButton} onPress={addGoal} disabled={addingGoal} activeOpacity={0.7}>
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {challenges.length === 0 ? (
        <Text style={styles.empty}>
          Noch keine Challenges vorhanden. Führe zuerst supabase/schema.sql und anschließend supabase/challenges.sql im Supabase SQL-Editor aus.
        </Text>
      ) : (
        SIZE_ORDER.map((size) => {
          const items = challenges.filter((c) => c.size === size);
          if (items.length === 0) return null;
          return (
            <View key={size} style={{ marginBottom: 8 }}>
              <Text style={styles.sectionTitle}>{SIZE_LABEL[size]}</Text>
              <View style={{ gap: 8, marginBottom: 12 }}>
                {items.map((item) => {
                  const active = isActive(item.id);
                  const times = doneCounts[item.id] ?? 0;
                  const status: CardState = active ? 'active' : times > 0 ? 'done' : 'open';
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.card}
                      activeOpacity={0.7}
                      onPress={() => (active ? finish(item, 'done') : start(item))}
                      onLongPress={active ? () => confirmCancel(item) : undefined}
                    >
                      <Ionicons name={STATUS_ICON[status]} size={22} color={STATUS_COLOR[status]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>
                          {CATEGORY_EMOJI[item.category]} {item.title}
                        </Text>
                        {item.description && (
                          <Text style={styles.cardDescription}>{item.description}</Text>
                        )}
                        <View style={styles.badgeRow}>
                          <Text style={styles.badge}>{CATEGORY_LABEL[item.category]}</Text>
                          {item.friend_friendly && <Text style={styles.badge}>👥 mit Freund</Text>}
                          {times > 0 && <Text style={[styles.badge, styles.doneBadge]}>✓ {times}× geschafft</Text>}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })
      )}
    </KeyboardAwareScroll>
  );
}

const styles = StyleSheet.create({
  // Abstände im Inhalt statt am ScrollView selbst — sonst schneidet Android unten ab.
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center' },
  header: { fontSize: 22, fontWeight: '600', marginBottom: 20 },
  monthCard: { backgroundColor: CARD_BG, borderRadius: 12, padding: 16, marginBottom: 16, alignItems: 'center' },
  monthLabel: { fontSize: 12, color: MUTED },
  monthValue: { fontSize: 18, fontWeight: '600', marginTop: 4, marginBottom: 12 },
  drawButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: BLUE, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 18 },
  drawButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: CARD_BG, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '600' },
  statLabel: { fontSize: 11, color: MUTED, marginTop: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: MUTED, marginBottom: 10, marginTop: 4 },
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: CARD_BG, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 14 },
  cardTitle: { fontSize: 15, marginBottom: 2 },
  cardTitleDone: { color: MUTED, textDecorationLine: 'line-through' },
  cardDescription: { fontSize: 12, color: '#666', lineHeight: 17, marginBottom: 6 },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  badge: { fontSize: 11, color: MUTED, backgroundColor: '#ececee', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  doneBadge: { color: ACCENT, backgroundColor: '#e8f8ec' },
  empty: { color: MUTED, marginTop: 20, lineHeight: 20 },
  tintedSection: { backgroundColor: '#eef6ef', borderRadius: 12, padding: 14, marginBottom: 20 },
  goalCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 14 },
  addRow: { flexDirection: 'row', gap: 8 },
  addInput: { flex: 1, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  addButton: { backgroundColor: ACCENT, width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
});
