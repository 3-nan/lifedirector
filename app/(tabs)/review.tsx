import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DayRing } from '../../components/day-ring';
import { OfflineBanner } from '../../components/offline-banner';
import { CATEGORY_EMOJI } from '../../lib/challenges';
import { DoneLog, doneDatesByHabit, fetchDoneLogs, frequencyChipLabel, habitColor, habitEmoji, isDaily, targetOf } from '../../lib/habits';
import { firstWeekMessage } from '../../lib/motivation';
import { cached } from '../../lib/offline';
import { todayStr } from '../../lib/period';
import {
  CompletedChallenge, DoneStep, DoneTask, DreamRef, ReviewData, Win, allTime, defaultMonthOffset, defaultWeekOffset,
  earliestDate, maxMonthOffset, maxWeekOffset, monthReview, weekReview,
} from '../../lib/review';
import { supabase } from '../../lib/supabase';
import { Habit } from '../../types/habit';
import { MonthlyGoal } from '../../types/monthlyGoal';
import {
  ACCENT, BLUE, CARD_BG, GREEN_TEXT, MUTED, MUTED_TEXT, PEACH, PURPLE, TEXT,
} from '../../constants/theme';

const DISMISSED_TIPS_KEY = 'review:dismissedTips';
const GREEN_BG = '#e3f7e8';

type Mode = 'week' | 'month';

function PeriodNav({ title, sub, onPrev, onNext }: { title: string; sub?: string; onPrev?: () => void; onNext?: () => void }) {
  return (
    <View style={styles.nav}>
      <TouchableOpacity onPress={onPrev} disabled={!onPrev} hitSlop={12}>
        <Ionicons name="chevron-back" size={20} color={onPrev ? BLUE : '#d1d1d6'} />
      </TouchableOpacity>
      <Text style={styles.navText}>
        <Text style={styles.navTitle}>{title}</Text>{sub ? ` · ${sub}` : ''}
      </Text>
      <TouchableOpacity onPress={onNext} disabled={!onNext} hitSlop={12}>
        <Ionicons name="chevron-forward" size={20} color={onNext ? BLUE : '#d1d1d6'} />
      </TouchableOpacity>
    </View>
  );
}

function Hero({ value, unit, title, text, tone, extra }: {
  value: number; unit: string; title: string; text: string; tone: 'green' | 'peach'; extra?: string;
}) {
  const color = tone === 'green' ? GREEN_TEXT : PEACH.text;
  return (
    <View style={[styles.hero, { backgroundColor: tone === 'green' ? GREEN_BG : PEACH.bg }]}>
      <View style={styles.heroNumber}>
        <Text style={[styles.heroValue, { color }]}>{value}</Text>
        <Text style={[styles.heroUnit, { color }]}>{unit}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.heroText}><Text style={styles.heroTitle}>{title}</Text> {text}</Text>
        {extra && <Text style={[styles.heroExtra, { color }]}>{extra}</Text>}
      </View>
    </View>
  );
}

function WinRow({ win }: { win: Win }) {
  return (
    <View style={styles.win}>
      <Text style={styles.winEmoji}>{win.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.winTitle}>{win.title}</Text>
        {win.sub && <Text style={styles.winSub}>{win.sub}</Text>}
      </View>
    </View>
  );
}

function Check({ color = ACCENT }: { color?: string }) {
  return (
    <View style={[styles.check, { backgroundColor: color }]}>
      <Ionicons name="checkmark" size={13} color="#fff" />
    </View>
  );
}

export default function ReviewScreen() {
  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('week');
  const [weekOffset, setWeekOffset] = useState<number | null>(null);
  const [monthOffset, setMonthOffset] = useState<number | null>(null);
  const [dismissedTips, setDismissedTips] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [habits, logs, tasks, goals, challenges, steps, dreams, dismissed] = await Promise.all([
      cached<Habit[]>('review:habits', () =>
        supabase.from('habits').select('*').eq('active', true).order('sort_order', { ascending: true })),
      cached<DoneLog[]>('review:doneLogs', fetchDoneLogs),
      cached<DoneTask[]>('review:tasks', () =>
        supabase.from('tasks').select('id, category, dream_id, week_key, completed_at').eq('done', true)),
      cached<MonthlyGoal[]>('review:goals', () =>
        supabase.from('monthly_goals').select('*').order('created_at', { ascending: true })),
      cached('review:challenges', () =>
        supabase
          .from('challenge_progress')
          .select('completed_at, challenge:challenges(id, title, category)')
          .eq('status', 'done')
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: true })),
      cached<DoneStep[]>('review:steps', () =>
        supabase.from('dream_steps').select('id, dream_id, title, done_at').not('done_at', 'is', null)),
      cached<DreamRef[]>('review:dreams', () => supabase.from('dreams').select('id, title, emoji, fulfilled_at')),
      AsyncStorage.getItem(DISMISSED_TIPS_KEY).catch(() => null),
    ]);
    setData({
      habits: habits ?? [],
      doneDates: doneDatesByHabit(logs ?? []),
      tasks: tasks ?? [],
      goals: goals ?? [],
      // Supabase typisiert die Relation als Liste, geliefert wird ein Objekt.
      challenges: ((challenges ?? []) as unknown as CompletedChallenge[]).filter((c) => c.challenge),
      steps: steps ?? [],
      dreams: dreams ?? [],
    });
    setDismissedTips(dismissed ? JSON.parse(dismissed) : []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading || !data) return <ActivityIndicator style={styles.center} />;

  const today = new Date();
  const earliest = earliestDate(data);
  const maxWeek = maxWeekOffset(earliest, today);
  const maxMonth = maxMonthOffset(earliest, today);
  const wOffset = Math.min(weekOffset ?? defaultWeekOffset(today), maxWeek);
  const mOffset = Math.min(monthOffset ?? defaultMonthOffset(today), maxMonth);

  // In den ersten 7 Tagen gibt es noch keine echten Muster, nur fehlende Historie.
  const earliestCreated = data.habits.length > 0
    ? Math.min(...data.habits.map((h) => new Date(h.created_at).getTime()))
    : null;
  const isFirstWeek = earliestCreated !== null && today.getTime() - earliestCreated < 7 * 24 * 3600 * 1000;

  async function applyTip(habit: Habit, target: number) {
    const { error } = await supabase.from('habits').update({ target_per_week: target }).eq('id', habit.id);
    if (error) { Alert.alert('Fehler', error.message); return; }
    load();
  }

  async function dismissTip(id: string) {
    const next = [...dismissedTips, id].slice(-50);
    setDismissedTips(next);
    await AsyncStorage.setItem(DISMISSED_TIPS_KEY, JSON.stringify(next)).catch(() => {});
  }

  function renderWeek() {
    const w = weekReview(data!, wOffset, isFirstWeek, today);
    const tip = w.tip && !dismissedTips.includes(w.tip.id) ? w.tip : null;
    return (
      <>
        <PeriodNav
          title={w.title}
          sub={w.range}
          onPrev={wOffset < maxWeek ? () => setWeekOffset(wOffset + 1) : undefined}
          onNext={wOffset > 0 ? () => setWeekOffset(wOffset - 1) : undefined}
        />
        <Hero
          value={w.total}
          unit="Haken"
          tone="green"
          title={w.headline.title}
          text={w.headline.text}
          extra={w.improvement ? `📈 +${w.improvement.diff} gegenüber ${w.improvement.previousTitle}` : undefined}
        />

        {w.wins.length > 0 && (
          <>
            <Text style={styles.section}>Deine Erfolge</Text>
            <View style={styles.list}>
              {w.wins.map((win, i) => <WinRow key={i} win={win} />)}
            </View>
          </>
        )}

        {w.rows.length > 0 && (
          <>
            <Text style={styles.section}>Deine Woche</Text>
            <View style={styles.days}>
              {w.days.map((d) => (
                <View key={d.date} style={[styles.dayCol, d.future && { opacity: 0.4 }]}>
                  <DayRing done={Math.round(d.rate * 100)} total={100} size={32} width={4}>
                    {d.perfect ? <Text style={styles.star}>⭐</Text> : null}
                  </DayRing>
                  <Text style={[styles.dayLabel, d.perfect && styles.dayLabelPerfect]}>{d.label}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.section}>Pro Gewohnheit</Text>
            <View style={styles.habitList}>
              {w.rows.map((r, i) => {
                const color = habitColor(r.habit);
                return (
                  <View key={r.habit.id} style={[styles.habitRow, i > 0 && styles.divider]}>
                    <Text style={styles.habitEmoji}>{habitEmoji(r.habit)}</Text>
                    <View style={styles.habitNameRow}>
                      <Text style={styles.habitName} numberOfLines={1}>{r.habit.name}</Text>
                      {r.met && <Text style={styles.metBadge}>✓ Ziel</Text>}
                    </View>
                    <View style={styles.dots}>
                      {r.dots.map((on, j) => (
                        <View key={j} style={[styles.dot, on && { backgroundColor: color.accent }]} />
                      ))}
                    </View>
                    <Text style={styles.habitCount}>{r.done}/{r.target}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {tip ? (
          <View style={styles.tip}>
            <Text style={styles.tipTitle}>Ein Gedanke für diese Woche</Text>
            <Text style={styles.tipText}>{tip.text}</Text>
            <View style={styles.tipActions}>
              <TouchableOpacity onPress={() => dismissTip(tip.id)} hitSlop={8}>
                <Text style={styles.tipLater}>Passt so</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tipButton} onPress={() => applyTip(tip.habit, tip.suggested)} activeOpacity={0.7}>
                <Text style={styles.tipButtonText}>Auf {frequencyChipLabel(tip.suggested)} ändern</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : isFirstWeek ? (
          <View style={styles.tip}>
            <Text style={styles.tipTitle}>Deine erste Woche</Text>
            <Text style={styles.tipText}>{firstWeekMessage(todayStr())}</Text>
          </View>
        ) : null}
      </>
    );
  }

  function renderMonth() {
    const m = monthReview(data!, mOffset, today);
    const total = allTime(data!, today);
    const hasGoals = m.challenges.length + m.goals.length + m.dreams.length + m.tasks.count + m.habits.length > 0;
    return (
      <>
        <PeriodNav
          title={m.title}
          sub={m.isCurrent ? 'bisher' : undefined}
          onPrev={mOffset < maxMonth ? () => setMonthOffset(mOffset + 1) : undefined}
          onNext={mOffset > 0 ? () => setMonthOffset(mOffset - 1) : undefined}
        />
        <Hero
          value={m.goalsReached > 0 ? m.goalsReached : m.checkOffs}
          unit={m.goalsReached > 0 ? (m.goalsReached === 1 ? 'Ziel erreicht' : 'Ziele erreicht') : 'Haken'}
          tone="peach"
          title={m.headline.title}
          text={m.headline.text}
        />

        {m.challenges.length > 0 && (
          <>
            <Text style={styles.section}>Challenge</Text>
            <View style={styles.list}>
              {m.challenges.map((c) => (
                <View key={c.number} style={[styles.item, { backgroundColor: PURPLE.bg }]}>
                  <Check color={PURPLE.accent} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{CATEGORY_EMOJI[c.category]} {c.title}</Text>
                    <Text style={styles.itemSub}>Gemeistert · deine {c.number}. Challenge</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {m.goals.length > 0 && (
          <>
            <Text style={styles.section}>Monatsziele</Text>
            <View style={styles.list}>
              {m.goals.map((g) => (
                <View key={g.id} style={styles.item}>
                  {g.done ? <Check /> : <View style={[styles.check, styles.checkOpen]} />}
                  <View style={{ flex: 1 }}>
                    <Text style={g.done ? styles.itemTitle : styles.itemTitleOpen}>{g.title}</Text>
                    {!g.done && <Text style={styles.itemSub}>{m.isCurrent ? 'noch offen' : 'offen geblieben'}</Text>}
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {(m.dreams.length > 0 || m.tasks.count > 0) && (
          <>
            <Text style={styles.section}>Träume & Wochen-Tasks</Text>
            <View style={styles.list}>
              {m.dreams.map((d) => (
                <View key={d.dream.id} style={[styles.item, { backgroundColor: PEACH.bg }]}>
                  <Text style={styles.itemEmoji}>{d.dream.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{d.fulfilled ? `${d.dream.title} — erfüllt ✨` : d.dream.title}</Text>
                    {d.steps > 0 && (
                      <Text style={styles.itemSub}>
                        {d.steps === 1 ? '1 Schritt gemacht' : `${d.steps} Schritte gemacht`}
                        {d.lastStep ? ` · zuletzt: ${d.lastStep}` : ''}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
              {m.tasks.count > 0 && (
                <View style={styles.item}>
                  <Text style={styles.itemEmoji}>✅</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{m.tasks.count === 1 ? '1 Wochen-Task' : `${m.tasks.count} Wochen-Tasks`} erledigt</Text>
                    {m.tasks.breakdown && <Text style={styles.itemSub}>{m.tasks.breakdown}</Text>}
                  </View>
                </View>
              )}
            </View>
          </>
        )}

        {m.habits.length > 0 && (
          <>
            <Text style={styles.section}>Gewohnheiten</Text>
            <View style={styles.habitList}>
              {m.habits.map((r, i) => {
                const color = habitColor(r.habit);
                const daily = isDaily(targetOf(r.habit));
                const sub = daily
                  ? `${r.checkOffs}× gemacht${r.met > 0 ? ` · ${r.met} ${r.met === 1 ? 'Woche' : 'Wochen'} komplett` : ''}`
                  : `Wochenziel in ${r.met} von ${r.counted} ${r.counted === 1 ? 'Woche' : 'Wochen'}`;
                return (
                  <View key={r.habit.id} style={[styles.habitRow, i > 0 && styles.divider]}>
                    <Text style={styles.habitEmoji}>{habitEmoji(r.habit)}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={styles.habitNameRow}>
                        <Text style={styles.habitName} numberOfLines={1}>{r.habit.name}</Text>
                        {r.onTrack && <Text style={styles.metBadge}>✓ jede Woche</Text>}
                      </View>
                      <Text style={styles.itemSub}>{sub}</Text>
                    </View>
                    <View style={styles.segments}>
                      {r.weeks.map((ratio, j) => (
                        <View key={j} style={styles.segment}>
                          <View style={[styles.segmentFill, { width: `${ratio * 100}%`, backgroundColor: color.accent }]} />
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {!hasGoals && <Text style={styles.empty}>In diesem Monat ist noch nichts eingetragen.</Text>}

        <Text style={styles.section}>Seit du dabei bist</Text>
        <View style={styles.tiles}>
          {[
            ['✔️', total.checkOffs, 'Haken'],
            ['🎯', total.weekGoals, 'Wochenziele'],
            ['📌', total.goalsDone, 'Monatsziele'],
            ['🏆', total.challenges, 'Challenges'],
            ['🪜', total.steps, 'Traum-Schritte'],
            ['✨', total.fulfilled, total.fulfilled === 1 ? 'Traum erfüllt' : 'Träume erfüllt'],
          ].map(([emoji, value, label]) => (
            <View key={label} style={styles.tile}>
              <Text style={styles.tileEmoji}>{emoji}</Text>
              <Text style={styles.tileValue}>{value}</Text>
              <Text style={styles.tileLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.section}>Abzeichen</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badges}>
          {total.badges.map((b) => (
            <View key={b.label} style={styles.badge}>
              <View style={[styles.medal, !b.unlocked && styles.medalLocked]}>
                <Text style={[styles.medalEmoji, !b.unlocked && { opacity: 0.35 }]}>{b.emoji}</Text>
              </View>
              <Text style={styles.badgeLabel}>{b.label}</Text>
            </View>
          ))}
        </ScrollView>
      </>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Rückblick</Text>
      <OfflineBanner />
      <View style={styles.segmented}>
        {(['week', 'month'] as const).map((value) => (
          <TouchableOpacity
            key={value}
            style={[styles.segmentButton, mode === value && styles.segmentButtonOn]}
            onPress={() => setMode(value)}
            activeOpacity={0.7}
          >
            <Text style={[styles.segmentText, mode === value && styles.segmentTextOn]}>
              {value === 'week' ? 'Woche' : 'Monat'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {data.habits.length === 0 && mode === 'week' ? (
        <Text style={styles.empty}>Noch keine Habits — leg im Habits-Tab deinen ersten an, dann füllt sich hier deine Woche.</Text>
      ) : mode === 'week' ? renderWeek() : renderMonth()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Abstände im Inhalt statt am ScrollView selbst — sonst schneidet Android unten ab.
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center' },
  header: { fontSize: 22, fontWeight: '600', marginBottom: 16 },
  segmented: { flexDirection: 'row', backgroundColor: '#ececee', borderRadius: 9, padding: 2, marginBottom: 12 },
  segmentButton: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 7 },
  segmentButtonOn: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segmentText: { fontSize: 13.5, color: MUTED_TEXT },
  segmentTextOn: { color: TEXT, fontWeight: '600' },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  navText: { fontSize: 13.5, color: MUTED_TEXT },
  navTitle: { color: TEXT, fontWeight: '600' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: 16, padding: 16, marginBottom: 8 },
  heroNumber: { alignItems: 'center', minWidth: 64 },
  heroValue: { fontSize: 40, fontWeight: '800', lineHeight: 44 },
  heroUnit: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  heroText: { fontSize: 13.5, color: '#3c3c40', lineHeight: 19 },
  heroTitle: { fontWeight: '700', color: TEXT },
  heroExtra: { fontSize: 12, fontWeight: '700', backgroundColor: '#fff', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2, marginTop: 8, alignSelf: 'flex-start', overflow: 'hidden' },
  section: { fontSize: 13, fontWeight: '600', color: MUTED, marginTop: 18, marginBottom: 8 },
  list: { gap: 6 },
  win: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: CARD_BG, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  winEmoji: { fontSize: 20, width: 26, textAlign: 'center' },
  winTitle: { fontSize: 14, fontWeight: '600', color: TEXT },
  winSub: { fontSize: 12, color: MUTED_TEXT, marginTop: 2 },
  days: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: CARD_BG, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 8 },
  dayCol: { flex: 1, alignItems: 'center', gap: 5 },
  star: { fontSize: 12 },
  dayLabel: { fontSize: 11, color: MUTED },
  dayLabelPerfect: { color: GREEN_TEXT, fontWeight: '700' },
  habitList: { backgroundColor: CARD_BG, borderRadius: 14, paddingHorizontal: 12 },
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  divider: { borderTopWidth: 1, borderTopColor: '#ececef' },
  habitEmoji: { fontSize: 18 },
  habitNameRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  habitName: { fontSize: 14, color: TEXT, flexShrink: 1 },
  metBadge: { fontSize: 10.5, fontWeight: '700', color: GREEN_TEXT, backgroundColor: GREEN_BG, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },
  dots: { flexDirection: 'row', gap: 3 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#e2e2e6' },
  habitCount: { fontSize: 12, color: MUTED_TEXT, width: 30, textAlign: 'right' },
  segments: { flexDirection: 'row', gap: 3 },
  segment: { width: 16, height: 6, borderRadius: 3, backgroundColor: '#e2e2e6', overflow: 'hidden' },
  segmentFill: { height: 6, borderRadius: 3 },
  tip: { backgroundColor: PEACH.bg, borderRadius: 14, padding: 14, marginTop: 18 },
  tipTitle: { fontSize: 12.5, fontWeight: '700', color: PEACH.text, marginBottom: 4 },
  tipText: { fontSize: 13.5, color: '#4a3a2c', lineHeight: 19 },
  tipActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16, marginTop: 10 },
  tipLater: { fontSize: 13, color: PEACH.text },
  tipButton: { backgroundColor: PEACH.button, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  tipButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: CARD_BG, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 12 },
  itemEmoji: { fontSize: 20, width: 22, textAlign: 'center' },
  itemTitle: { fontSize: 14, fontWeight: '600', color: TEXT },
  itemTitleOpen: { fontSize: 14, color: MUTED_TEXT },
  itemSub: { fontSize: 12, color: MUTED_TEXT, marginTop: 2 },
  check: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  checkOpen: { borderWidth: 2, borderColor: '#d1d1d6' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tile: { width: '32%', flexGrow: 1, backgroundColor: CARD_BG, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  tileEmoji: { fontSize: 18 },
  tileValue: { fontSize: 18, fontWeight: '700', color: TEXT, marginTop: 2 },
  tileLabel: { fontSize: 11, color: MUTED_TEXT },
  badges: { gap: 10, paddingRight: 8 },
  badge: { width: 68, alignItems: 'center' },
  medal: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#ffe7a8', borderWidth: 2, borderColor: '#f2c55c', justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  medalLocked: { backgroundColor: '#f0f0f2', borderColor: '#e2e2e6' },
  medalEmoji: { fontSize: 25 },
  badgeLabel: { fontSize: 10.5, color: MUTED_TEXT, textAlign: 'center', lineHeight: 13 },
  empty: { color: MUTED, marginTop: 16, lineHeight: 20 },
});
