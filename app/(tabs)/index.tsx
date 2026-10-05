import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CelebrationOverlay, CelebrationPayload } from '../../components/celebration';
import { CATEGORY_EMOJI, CATEGORY_LABEL, CATEGORY_ROTATION, setChallengeStatus } from '../../lib/challenges';
import {
  celebrationLine,
  challengeCompleteLine,
  computeMomentum,
  computeStreak,
  computeWeekMomentum,
  computeWeekStreak,
  dailyEncouragement,
  doneThisWeek,
  hitMilestone,
  Milestone,
  momentumNote,
  weekGoalLine,
} from '../../lib/motivation';
import { isDaily, targetOf } from '../../lib/habits';
import { setupDailyReminder } from '../../lib/notifications';
import { daysAgoStr, isoWeekKey, todayStr } from '../../lib/period';
import { supabase } from '../../lib/supabase';
import { Challenge, ChallengeCategory, ChallengeStatus } from '../../types/challenge';
import { Habit } from '../../types/habit';
import { Task } from '../../types/task';


const ACCENT = '#34c759';
const CARD_BG = '#f7f7f8';
const MUTED = '#9a9a9e';

const MOMENTUM_WINDOW_DAYS = 60;

const MILESTONE_EMOJI: Record<Milestone, string> = {
  3: '🔥',
  7: '⭐',
  30: '🏆',
  100: '👑',
};

function formatDateDE(isoDate: string): string {
  const [, month, day] = isoDate.split('-');
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
  const [historyMap, setHistoryMap] = useState<Record<string, Set<string>>>({});
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [activeChallenges, setActiveChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [celebration, setCelebration] = useState<CelebrationPayload | null>(null);
  const celebrationKey = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: habitsData } = await supabase
      .from('habits').select('*').eq('active', true).order('sort_order', { ascending: true });
    const { data: logsData } = await supabase
      .from('logs').select('habit_id, date, done').eq('date', todayStr());
    const { data: historyData } = await supabase
      .from('logs').select('habit_id, date, done').gte('date', daysAgoStr(MOMENTUM_WINDOW_DAYS)).eq('done', true);
    const { data: tasksData } = await supabase
      .from('tasks').select('*').eq('week_key', isoWeekKey()).order('created_at', { ascending: true });
    const { data: challengesData } = await supabase
      .from('challenges').select('*').eq('active', true);
    const { data: progressData } = await supabase
      .from('challenge_progress').select('challenge_id, status').eq('status', 'active');

    const map: Record<string, boolean> = {};
    logsData?.forEach((l) => { map[l.habit_id] = l.done; });

    const history: Record<string, Set<string>> = {};
    historyData?.forEach((l) => {
      if (!history[l.habit_id]) history[l.habit_id] = new Set();
      history[l.habit_id].add(l.date);
    });

    const activeIds = new Set(progressData?.map((p) => p.challenge_id));
    const active = (challengesData ?? []).filter((c) => activeIds.has(c.id));

    setHabits(habitsData ?? []);
    setDoneMap(map);
    setHistoryMap(history);
    setTasks(tasksData ?? []);
    setActiveChallenges(active);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    setupDailyReminder();
  }, []);

  function celebrate(milestone: Milestone, habit: Habit) {
    celebrationKey.current += 1;
    setCelebration({
      key: celebrationKey.current,
      emoji: MILESTONE_EMOJI[milestone],
      title: `${milestone}-Tage-Streak!`,
      line: celebrationLine(milestone, habit.name, habit.id),
    });
  }

  async function toggle(habit: Habit) {
    const newDone = !doneMap[habit.id];
    const today = todayStr();
    const prevDates = historyMap[habit.id] ?? new Set<string>();
    const target = targetOf(habit);

    const nextDates = new Set(prevDates);
    if (newDone) nextDates.add(today); else nextDates.delete(today);

    setDoneMap((prev) => ({ ...prev, [habit.id]: newDone }));
    setHistoryMap((prev) => ({ ...prev, [habit.id]: nextDates }));

    if (newDone && isDaily(target)) {
      const milestone = hitMilestone(computeStreak(prevDates), computeStreak(nextDates));
      if (milestone) celebrate(milestone, habit);
    } else if (newDone && doneThisWeek(prevDates) < target && doneThisWeek(nextDates) >= target) {
      celebrationKey.current += 1;
      setCelebration({
        key: celebrationKey.current,
        emoji: '🎯',
        title: 'Wochenziel erreicht!',
        line: weekGoalLine(habit.name, computeWeekStreak(nextDates, target), habit.id + today),
        durationMs: 3500,
      });
    }

    await supabase.from('logs').upsert(
      { habit_id: habit.id, date: today, done: newDone },
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

  async function completeChallenge(challenge: Challenge) {
    setActiveChallenges((prev) => prev.filter((c) => c.id !== challenge.id));
    celebrationKey.current += 1;
    setCelebration({
      key: celebrationKey.current,
      emoji: CATEGORY_EMOJI[challenge.category],
      title: 'Challenge gemeistert!',
      line: `${challenge.title}: ${challengeCompleteLine(challenge.size, challenge.id)}`,
      durationMs: 4000,
    });
    const { error } = await setChallengeStatus(challenge.id, 'done' satisfies ChallengeStatus);
    if (error) {
      setCelebration(null);
      setActiveChallenges((prev) => [...prev, challenge]);
      Alert.alert('Fehler', error.message);
    }
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

  // Ein 1–6×-Habit, dessen Wochenziel schon an anderen Tagen erreicht wurde,
  // ist heute nicht mehr "fällig" und zählt nicht gegen den Tagesfortschritt.
  const isDueToday = (h: Habit) => {
    if (doneMap[h.id] || isDaily(targetOf(h))) return true;
    const otherDays = new Set(historyMap[h.id] ?? []);
    otherDays.delete(todayStr());
    return doneThisWeek(otherDays) < targetOf(h);
  };
  const dueCount = habits.filter(isDueToday).length;
  const doneCount = habits.filter((h) => doneMap[h.id]).length;
  const encouragement = dailyEncouragement(doneCount, dueCount, todayStr());

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.dateLabel}>{formatDateDE(todayStr())}</Text>
        <Text style={styles.header}>Heute</Text>
        <Text style={styles.encouragement}>{encouragement}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: ACCENT }]}>{doneCount}</Text>
            <Text style={styles.statLabel}>Erledigt</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{doneCount}/{dueCount}</Text>
            <Text style={styles.statLabel}>Heute</Text>
          </View>
        </View>

        {activeChallenges.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Aktive Challenge</Text>
            <View style={{ gap: 8, marginBottom: 20 }}>
              {activeChallenges.map((challenge) => (
                <TouchableOpacity
                  key={challenge.id}
                  style={styles.challengeCard}
                  onPress={() => completeChallenge(challenge)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>{CATEGORY_EMOJI[challenge.category]} {challenge.title}</Text>
                    {challenge.description && (
                      <Text style={styles.challengeDescription}>{challenge.description}</Text>
                    )}
                  </View>
                  <Ionicons name="checkmark-circle-outline" size={24} color="#007aff" />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

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
            const dates = historyMap[item.id] ?? new Set<string>();
            const target = targetOf(item);
            const daily = isDaily(target);
            const createdAt = new Date(item.created_at);
            const streak = daily ? computeStreak(dates) : computeWeekStreak(dates, target);
            const momentum = daily ? computeMomentum(dates, createdAt) : computeWeekMomentum(dates, target, createdAt);
            const note = momentumNote(streak, momentum, daily ? 'day' : 'week');
            const weekCount = doneThisWeek(dates);
            const weekGoalMet = weekCount >= target;
            return (
              <TouchableOpacity key={item.id} style={styles.card} onPress={() => toggle(item)} activeOpacity={0.7}>
                <View style={[styles.checkCircle, checked && styles.checkCircleDone]}>
                  {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, checked && styles.labelDone]}>{item.name}</Text>
                  {!daily && (
                    <Text style={[styles.weekProgress, weekGoalMet && styles.weekProgressMet]}>
                      {weekGoalMet ? `✓ Wochenziel erreicht (${weekCount}/${target})` : `${weekCount}/${target} diese Woche`}
                    </Text>
                  )}
                  {note && <Text style={styles.momentumNote}>{note}</Text>}
                </View>
                {streak > 0 && (
                  <View style={styles.streakBadge}>
                    <Text style={styles.streakText}>🔥 {streak}{daily ? '' : ' Wo.'}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
          {habits.length === 0 && <Text style={styles.empty}>Noch keine Habits angelegt.</Text>}
        </View>
      </ScrollView>

      <CelebrationOverlay payload={celebration} onDismiss={() => setCelebration(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center' },
  dateLabel: { fontSize: 13, color: MUTED, marginBottom: 2 },
  header: { fontSize: 22, fontWeight: '600', marginBottom: 6 },
  encouragement: { fontSize: 13, color: '#555', lineHeight: 18, marginBottom: 20 },
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
  weekProgress: { fontSize: 11, color: MUTED, marginTop: 3 },
  weekProgressMet: { color: ACCENT, fontWeight: '600' },
  momentumNote: { fontSize: 11, color: '#007aff', marginTop: 3 },
  streakBadge: { backgroundColor: '#fff0e0', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  streakText: { fontSize: 12, fontWeight: '600', color: '#b25900' },
  challengeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#eaf2ff', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 14 },
  challengeDescription: { fontSize: 12, color: '#666', marginTop: 4, lineHeight: 17 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  badge: { fontSize: 11, color: MUTED, backgroundColor: '#ececee', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  addRow: { flexDirection: 'row', gap: 8 },
  addInput: { flex: 1, backgroundColor: CARD_BG, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  addButton: { backgroundColor: ACCENT, width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  empty: { color: MUTED, marginTop: 4, marginBottom: 4 },
});
