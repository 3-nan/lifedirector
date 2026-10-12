import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CelebrationOverlay, CelebrationPayload } from '../../components/celebration';
import { DayRing } from '../../components/day-ring';
import { KeyboardAwareScroll } from '../../components/keyboard-aware';
import { OfflineBanner } from '../../components/offline-banner';
import { isSecured } from '../../lib/account';
import { dreamColor, nextStepToWeeklyTask, pickDreamOfWeek, updateDream } from '../../lib/dreams';
import { CATEGORY_EMOJI, CATEGORY_LABEL, CATEGORY_ROTATION, setChallengeStatus } from '../../lib/challenges';
import {
  celebrationLine,
  challengeCompleteLine,
  computeMomentum,
  computeStreak,
  computeWeekMomentum,
  computeWeekStreak,
  dailyEncouragement,
  dreamStepLine,
  doneThisWeek,
  hitMilestone,
  Milestone,
  momentumNote,
  weekGoalLine,
} from '../../lib/motivation';
import { isDaily, targetOf } from '../../lib/habits';
import { setupDailyReminder } from '../../lib/notifications';
import { refreshDreamWidgets } from '../../lib/widget-bridge';
import { daysAgoStr, isoWeekKey, todayStr } from '../../lib/period';
import { cached, pendingHabitDone, pendingTaskDone, setHabitDone, setTaskDone, syncPending } from '../../lib/offline';
import { supabase } from '../../lib/supabase';
import { Challenge, ChallengeCategory, ChallengeStatus } from '../../types/challenge';
import { Dream } from '../../types/dream';
import { Habit } from '../../types/habit';
import { Task } from '../../types/task';
import { ACCENT, BLUE, CARD_BG, MUTED, MUTED_TEXT, ORANGE_TEXT, PEACH, PURPLE } from '../../constants/theme';

const MOMENTUM_WINDOW_DAYS = 60;

// "Konto sichern"-Hinweis erst nach einer Woche Nutzung — vorher wäre es
// Reibung, bevor man überhaupt weiß, ob man die App behalten will.
const SECURE_NUDGE_AFTER_DAYS = 7;
const SECURE_NUDGE_DISMISSED_KEY = 'secureNudgeDismissed';

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

/** Tage bis Monatsende — Challenges laufen (vorerst) einen Kalendermonat. */
function challengeDaysLeftLabel(): string {
  const now = new Date();
  const left = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
  if (left === 0) return 'LETZTER TAG';
  return left === 1 ? 'NOCH 1 TAG' : `NOCH ${left} TAGE`;
}

/** Hinweis nur für ungesicherte Accounts, ab einer Woche Nutzung, bis "Später" getippt wurde. */
async function shouldShowSecureNudge(habits: Habit[]): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || isSecured(session)) return false;
  const dismissed = await AsyncStorage.getItem(SECURE_NUDGE_DISMISSED_KEY).catch(() => null);
  if (dismissed) return false;
  const starts = [new Date(session.user.created_at).getTime(), ...habits.map((h) => new Date(h.created_at).getTime())];
  const daysSinceStart = (Date.now() - Math.min(...starts)) / (24 * 3600 * 1000);
  return daysSinceStart >= SECURE_NUDGE_AFTER_DAYS;
}

/** Traum der Woche oben in der Wochenkarte: sein Schritt diese Woche, sonst der nächste Schritt oder ein Eingabefeld. */
function DreamOfWeekBox({
  dream,
  stepTask,
  stepInput,
  onStepInputChange,
  onOpen,
  onToggleStep,
  onSaveStep,
  onStepToWeek,
}: {
  dream: Dream;
  stepTask: Task | undefined;
  stepInput: string;
  onStepInputChange: (text: string) => void;
  onOpen: () => void;
  onToggleStep: (task: Task) => void;
  onSaveStep: () => void;
  onStepToWeek: () => void;
}) {
  const color = dreamColor(dream.color);
  const photo = (
    <TouchableOpacity onPress={onOpen} accessibilityLabel={`Traum öffnen: ${dream.title}`} activeOpacity={0.8}>
      {dream.image_url ? (
        <Image source={{ uri: dream.image_url }} style={styles.dreamPhoto} resizeMode="cover" />
      ) : (
        <View style={[styles.dreamPhoto, styles.dreamPhotoEmpty, { backgroundColor: color.bg }]}>
          <Text style={styles.dreamPhotoEmoji}>{dream.emoji}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (stepTask) {
    const checked = stepTask.done;
    return (
      <View style={styles.dreamBox}>
        {photo}
        <TouchableOpacity style={styles.dreamBoxBody} onPress={() => onToggleStep(stepTask)} activeOpacity={0.7}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.dreamStepTitle, checked && styles.weekTaskDone]}>{stepTask.title}</Text>
            <Text style={[styles.dreamStepMeta, { color: color.accent }]}>{dream.emoji} Schritt zu: {dream.title}</Text>
          </View>
          <View style={[styles.weekCheck, checked && styles.checkCircleDone]}>
            {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.dreamBox, { flexDirection: 'column' }]}>
      <View style={{ flexDirection: 'row' }}>
        {photo}
        <View style={[styles.dreamBoxBody, { flexDirection: 'column', alignItems: 'flex-start', gap: 2 }]}>
          <Text style={styles.dreamOfWeekLabel}>{dream.emoji} Traum der Woche: {dream.title}</Text>
          <Text style={styles.dreamStepTitle}>
            {dream.next_step ?? 'Was ist dein nächster kleiner Schritt?'}
          </Text>
        </View>
      </View>
      <View style={styles.dreamBoxActions}>
        {dream.next_step ? (
          <TouchableOpacity style={[styles.peachButton, { flex: 1 }]} onPress={onStepToWeek} activeOpacity={0.7}>
            <Text style={styles.peachButtonText}>In diese Woche</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TextInput
              style={[styles.peachInput, { flex: 1 }]}
              placeholder="z.B. 3 Angebote vergleichen"
              placeholderTextColor={MUTED}
              accessibilityLabel="Nächster Schritt"
              value={stepInput}
              onChangeText={onStepInputChange}
              onSubmitEditing={onSaveStep}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.peachButton, !stepInput.trim() && { opacity: 0.4 }]}
              onPress={onSaveStep}
              disabled={!stepInput.trim()}
              activeOpacity={0.7}
            >
              <Text style={styles.peachButtonText}>Festlegen</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

export default function TodayScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [doneMap, setDoneMap] = useState<Record<string, boolean>>({});
  const [historyMap, setHistoryMap] = useState<Record<string, Set<string>>>({});
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [dreamStepInput, setDreamStepInput] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<ChallengeCategory | null>(null);
  const [taskInputFocused, setTaskInputFocused] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [activeChallenges, setActiveChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [celebration, setCelebration] = useState<CelebrationPayload | null>(null);
  const [showSecureNudge, setShowSecureNudge] = useState(false);
  const router = useRouter();
  const celebrationKey = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    // Erst offline Abgehaktes übertragen, dann laden. Ohne Netz kommt überall
    // der zuletzt gespeicherte Stand (lib/offline.ts).
    await syncPending();
    const today = todayStr();
    const habitsData = await cached<Habit[]>('today:habits', () =>
      supabase.from('habits').select('*').eq('active', true).order('sort_order', { ascending: true }));
    const logsData = await cached<{ habit_id: string; date: string; done: boolean }[]>(`today:logs:${today}`, () =>
      supabase.from('logs').select('habit_id, date, done').eq('date', today));
    const historyData = await cached<{ habit_id: string; date: string }[]>('today:history', () =>
      supabase.from('logs').select('habit_id, date, done').gte('date', daysAgoStr(MOMENTUM_WINDOW_DAYS)).eq('done', true));
    const dreamsData = await cached<Dream[]>('today:dreams', () => supabase.from('dreams').select('*'));
    const tasksData = await cached<Task[]>(`today:tasks:${isoWeekKey()}`, () =>
      supabase.from('tasks').select('*').eq('week_key', isoWeekKey()).order('created_at', { ascending: true }));
    const challengesData = await cached<Challenge[]>('today:challenges', () =>
      supabase.from('challenges').select('*').eq('active', true));
    const progressData = await cached<{ challenge_id: string }[]>('today:progress', () =>
      supabase.from('challenge_progress').select('challenge_id, status').eq('status', 'active'));

    const map: Record<string, boolean> = {};
    logsData?.forEach((l) => { map[l.habit_id] = l.done; });

    const history: Record<string, Set<string>> = {};
    historyData?.forEach((l) => {
      if (!history[l.habit_id]) history[l.habit_id] = new Set();
      history[l.habit_id].add(l.date);
    });

    // Offline gemerkte Haken darüberlegen, bis sie übertragen sind.
    for (const p of await pendingHabitDone()) {
      if (p.date === today) map[p.habitId] = p.done;
      if (!history[p.habitId]) history[p.habitId] = new Set();
      if (p.done) history[p.habitId].add(p.date);
      else history[p.habitId].delete(p.date);
    }
    const pendingTasks = await pendingTaskDone();
    const tasksWithPending = (tasksData ?? []).map((t) => (t.id in pendingTasks ? { ...t, done: pendingTasks[t.id] } : t));

    const activeIds = new Set(progressData?.map((p) => p.challenge_id));
    const active = (challengesData ?? []).filter((c) => activeIds.has(c.id));

    setHabits(habitsData ?? []);
    setDoneMap(map);
    setHistoryMap(history);
    setTasks(tasksWithPending);
    setDreams(dreamsData ?? []);
    setActiveChallenges(active);
    setShowSecureNudge(await shouldShowSecureNudge(habitsData ?? []));
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    setupDailyReminder();
  }, []);

  function dismissSecureNudge() {
    setShowSecureNudge(false);
    AsyncStorage.setItem(SECURE_NUDGE_DISMISSED_KEY, '1').catch(() => {});
  }

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

    await setHabitDone(habit.id, today, newDone);
  }

  async function toggleTask(task: Task) {
    const newDone = !task.done;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: newDone } : t)));
    const dream = task.dream_id ? dreams.find((d) => d.id === task.dream_id) : undefined;
    if (newDone && dream) {
      celebrationKey.current += 1;
      setCelebration({
        key: celebrationKey.current,
        emoji: dream.emoji,
        title: 'Ein Schritt näher!',
        line: dreamStepLine(dream.title, task.id),
        durationMs: 3500,
      });
    }
    // Der zugehörige Traum-Schritt wird per DB-Trigger mit abgehakt.
    await setTaskDone(task.id, newDone);
    if (task.dream_id) refreshDreamWidgets();
  }

  async function saveDreamOfWeekStep(dream: Dream) {
    const title = dreamStepInput.trim();
    if (!title) return;
    await updateDream(dream.id, { next_step: title });
    setDreamStepInput('');
    load();
  }

  async function dreamOfWeekToTask(dream: Dream) {
    await nextStepToWeeklyTask(dream);
    load();
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

  async function addTask() {
    const title = newTaskTitle.trim();
    if (!title || addingTask) return;
    setAddingTask(true);
    const { error } = await supabase.from('tasks').insert({ title, category: newTaskCategory, week_key: isoWeekKey() });
    setAddingTask(false);
    if (error) { Alert.alert('Fehler', error.message); return; }
    setNewTaskTitle('');
    setNewTaskCategory(null);
    load();
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
  const dreamOfWeek = pickDreamOfWeek(dreams);
  const dreamsById = Object.fromEntries(dreams.map((d) => [d.id, d]));

  // Wochenkarte: der Schritt zum Traum der Woche steht oben, der Rest offen
  // vor erledigt (sonst in Anlage-Reihenfolge).
  const weekNumber = Number(isoWeekKey().split('-W')[1]);
  const dreamStepTask = dreamOfWeek ? tasks.find((t) => t.dream_id === dreamOfWeek.id) : undefined;
  const otherTasks = tasks.filter((t) => t !== dreamStepTask).sort((a, b) => Number(a.done) - Number(b.done));
  const tasksDone = tasks.filter((t) => t.done).length;

  const habitRows = habits.map((habit) => {
    const dates = historyMap[habit.id] ?? new Set<string>();
    const target = targetOf(habit);
    const daily = isDaily(target);
    const createdAt = new Date(habit.created_at);
    const streak = daily ? computeStreak(dates) : computeWeekStreak(dates, target);
    const momentum = daily ? computeMomentum(dates, createdAt) : computeWeekMomentum(dates, target, createdAt);
    return { habit, streak, daily, target, note: momentumNote(streak, momentum, daily ? 'day' : 'week'), weekCount: doneThisWeek(dates) };
  });
  const longest = habitRows.reduce<(typeof habitRows)[number] | null>((best, r) => (r.streak > (best?.streak ?? 0) ? r : best), null);
  const habitHeadLine =
    dueCount > 0 && doneCount >= dueCount
      ? 'Alles erledigt für heute.'
      : longest
        ? `Längste Serie: ${longest.habit.name}, ${longest.streak} ${longest.daily ? (longest.streak === 1 ? 'Tag' : 'Tage') : (longest.streak === 1 ? 'Woche' : 'Wochen')} 🔥`
        : null;

  return (
    <View style={{ flex: 1 }}>
      <KeyboardAwareScroll style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.dateLabel}>{formatDateDE(todayStr())}</Text>
            <Text style={styles.header}>Heute</Text>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => router.push('/settings')}
            accessibilityLabel="Einstellungen"
            hitSlop={6}
          >
            <Ionicons name="settings-outline" size={22} color={MUTED} />
          </TouchableOpacity>
        </View>
        <Text style={styles.encouragement}>{encouragement}</Text>
        <OfflineBanner canCheckOff />

        {showSecureNudge && (
          <View style={styles.nudgeCard}>
            <View style={styles.nudgeTop}>
              <Ionicons name="shield-checkmark-outline" size={22} color="#007aff" />
              <View style={{ flex: 1 }}>
                <Text style={styles.nudgeTitle}>Sichere deinen Fortschritt</Text>
                <Text style={styles.nudgeText}>
                  Eine Woche dabei — stark. Gerade hängen deine Daten nur an diesem Handy. Mit deiner E-Mail bleiben sie auch bei Handywechsel erhalten.
                </Text>
              </View>
            </View>
            <View style={styles.nudgeActions}>
              <TouchableOpacity style={styles.nudgeLater} onPress={dismissSecureNudge}>
                <Text style={styles.nudgeLaterText}>Später</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.nudgeSecure} onPress={() => router.push('/settings')} activeOpacity={0.7}>
                <Text style={styles.nudgeSecureText}>Jetzt sichern</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Wochenkarte: der Traum-Schritt der Woche oben, darunter alle Wochen-Tasks. */}
        <View style={styles.weekCard}>
          <View style={styles.weekHead}>
            <Text style={styles.weekLabel}>DIESE WOCHE · KW {weekNumber}</Text>
            {tasks.length > 0 && <Text style={styles.weekCount}>{tasksDone} von {tasks.length} erledigt</Text>}
          </View>
          {tasks.length > 0 && (
            <View style={styles.weekBar}>
              <View style={[styles.weekBarFill, { width: `${Math.round((tasksDone / tasks.length) * 100)}%` }]} />
            </View>
          )}

          {dreamOfWeek && (
            <DreamOfWeekBox
              dream={dreamOfWeek}
              stepTask={dreamStepTask}
              stepInput={dreamStepInput}
              onStepInputChange={setDreamStepInput}
              onOpen={() => router.push({ pathname: '/dream/[id]', params: { id: dreamOfWeek.id } })}
              onToggleStep={toggleTask}
              onSaveStep={() => saveDreamOfWeekStep(dreamOfWeek)}
              onStepToWeek={() => dreamOfWeekToTask(dreamOfWeek)}
            />
          )}

          {otherTasks.length > 0 && (
            <View>
              {otherTasks.map((item, i) => {
                const checked = item.done;
                const dream = item.dream_id ? dreamsById[item.dream_id] : undefined;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.weekTask, i > 0 && styles.weekTaskDivider]}
                    onPress={() => toggleTask(item)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.weekCheck, checked && styles.checkCircleDone]}>
                      {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                    <Text style={[styles.weekTaskTitle, checked && styles.weekTaskDone]}>{item.title}</Text>
                    {item.category && <Text style={styles.weekTaskIcon} accessibilityLabel={CATEGORY_LABEL[item.category]}>{CATEGORY_EMOJI[item.category]}</Text>}
                    {dream && <Text style={styles.weekTaskIcon} accessibilityLabel={`Traum: ${dream.title}`}>{dream.emoji}</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {tasks.length === 0 && !dreamOfWeek && <Text style={styles.weekEmpty}>Was steht diese Woche an?</Text>}

          <View style={styles.addArea}>
            <View style={styles.addRow}>
              <TextInput
                style={[styles.peachInput, { flex: 1 }]}
                placeholder="Neuer Task für diese Woche"
                placeholderTextColor={MUTED}
                accessibilityLabel="Neuer Task für diese Woche"
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
                onFocus={() => setTaskInputFocused(true)}
                onBlur={() => setTaskInputFocused(false)}
                onSubmitEditing={addTask}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[styles.addButton, (!newTaskTitle.trim() || addingTask) && { opacity: 0.4 }]}
                onPress={addTask}
                disabled={!newTaskTitle.trim() || addingTask}
                accessibilityLabel="Task hinzufügen"
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
            {(taskInputFocused || newTaskTitle.trim().length > 0) && (
              <View style={{ gap: 6 }}>
                <Text style={styles.chipHint}>Kategorie (optional)</Text>
                <View style={styles.chipRow}>
                  {CATEGORY_ROTATION.map((cat) => {
                    const selected = newTaskCategory === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.chip, selected && styles.chipSelected]}
                        onPress={() => setNewTaskCategory(selected ? null : cat)}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                          {CATEGORY_EMOJI[cat]} {CATEGORY_LABEL[cat]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        </View>

        {activeChallenges.map((challenge) => (
          <View key={challenge.id} style={styles.challengeCard}>
            <View style={styles.challengeEmojiBox}>
              <Text style={styles.challengeEmoji}>{CATEGORY_EMOJI[challenge.category]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.challengeLabel}>CHALLENGE · {challengeDaysLeftLabel()}</Text>
              <Text style={styles.challengeTitle}>{challenge.title}</Text>
              {challenge.description && <Text style={styles.challengeDescription}>{challenge.description}</Text>}
            </View>
            <TouchableOpacity
              style={styles.challengeButton}
              onPress={() => completeChallenge(challenge)}
              accessibilityLabel={`Challenge geschafft: ${challenge.title}`}
              activeOpacity={0.7}
            >
              <Text style={styles.challengeButtonText}>Geschafft</Text>
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.habitHead}>
          <DayRing done={doneCount} total={dueCount} />
          <View style={{ flex: 1 }}>
            <Text style={styles.habitHeadTitle}>Gewohnheiten heute</Text>
            {habitHeadLine && <Text style={styles.habitHeadLine}>{habitHeadLine}</Text>}
          </View>
        </View>
        {habits.length > 0 ? (
          <View style={styles.habitList}>
            {habitRows.map(({ habit: item, streak, daily, note, weekCount, target }, i) => {
              const checked = !!doneMap[item.id];
              const weekGoalMet = weekCount >= target;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.habitRow, i > 0 && styles.habitRowDivider]}
                  onPress={() => toggle(item)}
                  activeOpacity={0.7}
                >
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
                  {streak > 0 && <Text style={styles.streakText}>🔥 {streak}{daily ? '' : ' Wo.'}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <Text style={styles.empty}>Noch keine Habits angelegt.</Text>
        )}
      </KeyboardAwareScroll>

      <CelebrationOverlay payload={celebration} onDismiss={() => setCelebration(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Abstände im Inhalt statt am ScrollView selbst — sonst schneidet Android unten ab.
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center' },
  dateLabel: { fontSize: 13, color: MUTED, marginBottom: 2 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  settingsButton: { width: 44, height: 44, marginTop: -6, marginRight: -10, justifyContent: 'center', alignItems: 'center' },
  nudgeCard: { backgroundColor: '#eaf2ff', borderRadius: 12, padding: 14, gap: 10, marginBottom: 20 },
  nudgeTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  nudgeTitle: { fontSize: 15, fontWeight: '600' },
  nudgeText: { fontSize: 13, color: '#444', lineHeight: 19, marginTop: 3 },
  nudgeActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  nudgeLater: { minHeight: 40, paddingHorizontal: 14, justifyContent: 'center' },
  nudgeLaterText: { fontSize: 14, color: '#555' },
  nudgeSecure: { minHeight: 40, paddingHorizontal: 16, borderRadius: 10, backgroundColor: BLUE, justifyContent: 'center' },
  nudgeSecureText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  header: { fontSize: 22, fontWeight: '600', marginBottom: 6 },
  encouragement: { fontSize: 13, color: '#555', lineHeight: 18, marginBottom: 20 },

  weekCard: { backgroundColor: PEACH.bg, borderRadius: 18, padding: 14, gap: 10, marginBottom: 16 },
  weekHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  weekLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, color: PEACH.text },
  weekCount: { fontSize: 12, fontWeight: '600', color: PEACH.text },
  weekBar: { height: 6, borderRadius: 3, backgroundColor: PEACH.line, overflow: 'hidden', marginTop: -2 },
  weekBarFill: { height: 6, borderRadius: 3, backgroundColor: PEACH.bar },
  dreamBox: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  dreamPhoto: { width: 60, height: '100%', minHeight: 60 },
  dreamPhotoEmpty: { justifyContent: 'center', alignItems: 'center' },
  dreamPhotoEmoji: { fontSize: 26 },
  dreamBoxBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 12, justifyContent: 'center' },
  dreamOfWeekLabel: { fontSize: 11.5, fontWeight: '600', color: PEACH.text },
  dreamStepTitle: { fontSize: 15 },
  dreamStepMeta: { fontSize: 11.5, marginTop: 2 },
  dreamBoxActions: { flexDirection: 'row', gap: 8, paddingHorizontal: 10, paddingBottom: 10, paddingTop: 2 },
  peachInput: { minHeight: 44, borderRadius: 10, borderWidth: 1.5, borderColor: PEACH.line, backgroundColor: PEACH.field, paddingHorizontal: 12, fontSize: 14 },
  peachButton: { minHeight: 44, paddingHorizontal: 14, borderRadius: 10, backgroundColor: PEACH.button, justifyContent: 'center', alignItems: 'center' },
  peachButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  weekTask: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingHorizontal: 2 },
  weekTaskDivider: { borderTopWidth: 1, borderTopColor: PEACH.line },
  weekCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: PEACH.ring, justifyContent: 'center', alignItems: 'center' },
  weekTaskTitle: { flex: 1, fontSize: 15, paddingVertical: 10 },
  weekTaskDone: { color: PEACH.done, textDecorationLine: 'line-through' },
  weekTaskIcon: { fontSize: 13 },
  weekEmpty: { fontSize: 14, color: PEACH.done },
  addArea: { gap: 8, borderTopWidth: 1, borderTopColor: PEACH.line, paddingTop: 10 },
  addRow: { flexDirection: 'row', gap: 8 },
  addButton: { backgroundColor: PEACH.button, width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  chipHint: { fontSize: 11.5, color: PEACH.done },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { minHeight: 36, paddingHorizontal: 11, borderRadius: 18, borderWidth: 1.5, borderColor: PEACH.line, backgroundColor: PEACH.field, justifyContent: 'center' },
  chipSelected: { backgroundColor: PEACH.button, borderColor: PEACH.button },
  chipText: { fontSize: 13 },
  chipTextSelected: { color: '#fff', fontWeight: '600' },

  challengeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: PURPLE.bg, borderRadius: 16, padding: 14, marginBottom: 16 },
  challengeEmojiBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  challengeEmoji: { fontSize: 26 },
  challengeLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, color: PURPLE.accent },
  challengeTitle: { fontSize: 16, fontWeight: '600', marginTop: 2 },
  challengeDescription: { fontSize: 12.5, color: '#555', marginTop: 2, lineHeight: 17 },
  challengeButton: { minHeight: 44, paddingHorizontal: 12, borderRadius: 12, backgroundColor: PURPLE.accent, justifyContent: 'center' },
  challengeButtonText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  habitHead: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 2, marginBottom: 10 },
  habitHeadTitle: { fontSize: 17, fontWeight: '600' },
  habitHeadLine: { fontSize: 12.5, color: MUTED_TEXT, marginTop: 2 },
  habitList: { backgroundColor: CARD_BG, borderRadius: 14, paddingHorizontal: 14 },
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingVertical: 10 },
  habitRowDivider: { borderTopWidth: 1, borderTopColor: '#ececef' },
  checkCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#c7c7cc', justifyContent: 'center', alignItems: 'center' },
  checkCircleDone: { backgroundColor: ACCENT, borderColor: ACCENT },
  label: { fontSize: 15 },
  labelDone: { color: MUTED, textDecorationLine: 'line-through' },
  weekProgress: { fontSize: 11, color: MUTED, marginTop: 3 },
  weekProgressMet: { color: ACCENT, fontWeight: '600' },
  momentumNote: { fontSize: 11, color: BLUE, marginTop: 3 },
  streakText: { fontSize: 12, fontWeight: '600', color: ORANGE_TEXT },
  empty: { color: MUTED, marginTop: 4, marginBottom: 4 },
});
