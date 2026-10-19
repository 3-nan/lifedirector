import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GREEN_TEXT, MUTED_TEXT, SKY } from '../constants/theme';
import {
  addDaysStr, afterStepDone, decisionList, decisionMeta, fetchChores, letGoChore, postponePatch, targetWeek, updateChore,
  weekOf,
} from '../lib/chores';
import { refreshChoreReminders } from '../lib/notifications';
import { setChoreDone } from '../lib/offline';
import { todayStr } from '../lib/period';
import { Chore } from '../types/chore';

type Decision = 'Diese Woche' | 'Erledigt ✓' | 'Später' | 'Irgendwann' | 'Losgelassen';

/** Wochen-Check: eine Karte pro Aufgabe, die eine Entscheidung braucht. */
export default function ChoresReviewScreen() {
  const router = useRouter();
  const [all, setAll] = useState<Chore[]>([]);
  // Beim Öffnen festgehalten, damit sich die Liste beim Entscheiden nicht verschiebt.
  const [queue, setQueue] = useState<Chore[] | null>(null);
  const [index, setIndex] = useState(0);
  const [log, setLog] = useState<{ title: string; choice: Decision }[]>([]);
  const [laterOpen, setLaterOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchChores().then(({ data }) => {
      const chores = (data ?? []) as Chore[];
      setAll(chores);
      setQueue(decisionList(chores));
    });
  }, []);

  if (!queue) return <ActivityIndicator style={styles.center} />;

  const today = todayStr();
  const sunday = new Date(`${today}T12:00:00Z`).getUTCDay() === 0;
  const finished = index >= queue.length;
  const current = finished ? null : queue[index];

  async function decide(choice: Decision) {
    if (!current || busy) return;
    setBusy(true);
    const now = new Date().toISOString();
    let error: { message: string } | null = null;
    if (choice === 'Erledigt ✓') {
      await setChoreDone(current.id, true);
      await afterStepDone(current, all);
    } else if (choice === 'Losgelassen') {
      ({ error } = await letGoChore(current));
    } else {
      const to =
        choice === 'Diese Woche' ? { week: targetWeek(today) }
          : choice === 'Später' ? { week: weekOf(addDaysStr(today, 14)) }
            : ('someday' as const);
      ({ error } = await updateChore(current.id, { ...postponePatch(current, to), last_decided_at: now }));
    }
    setBusy(false);
    if (error) {
      Alert.alert('Fehler', error.message);
      return;
    }
    setLog((prev) => [...prev, { title: current.title, choice }]);
    setLaterOpen(false);
    setIndex((i) => i + 1);
    if (index + 1 >= queue!.length) refreshChoreReminders();
  }

  return (
    <View style={styles.container}>
      <View style={styles.head}>
        <View>
          <Text style={styles.header}>Wochen-Check</Text>
          <Text style={styles.progress}>
            {finished ? `Fertig · ${log.length} entschieden` : `${index + 1} von ${queue.length} · ca. 2 Minuten`}
          </Text>
        </View>
        <TouchableOpacity style={styles.close} onPress={() => router.back()} accessibilityLabel="Schließen">
          <Ionicons name="close" size={20} color="#4a4a4f" />
        </TouchableOpacity>
      </View>

      {queue.length > 0 && (
        <View style={styles.segments}>
          {queue.map((c, i) => (
            <View key={c.id} style={[styles.segment, i < index && styles.segmentDone, i === index && styles.segmentNow]} />
          ))}
        </View>
      )}

      {current ? (
        <View style={{ gap: 16, flex: 1 }}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{current.title}</Text>
            <Text style={styles.cardMeta}>{decisionMeta(current, today)}</Text>
          </View>
          <Text style={styles.question}>Was machst du damit?</Text>
          {laterOpen ? (
            <View style={{ gap: 8 }}>
              <TouchableOpacity style={styles.soft} onPress={() => decide('Später')} disabled={busy}>
                <Text style={styles.softText}>In zwei Wochen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.soft} onPress={() => decide('Irgendwann')} disabled={busy}>
                <Text style={styles.softText}>Irgendwann</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.textButton} onPress={() => setLaterOpen(false)}>
                <Text style={styles.textButtonText}>Zurück</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              <TouchableOpacity style={styles.primary} onPress={() => decide('Diese Woche')} disabled={busy} activeOpacity={0.8}>
                <Text style={styles.primaryText}>{sunday ? 'Mitnehmen in die neue Woche' : 'Mitnehmen in diese Woche'}</Text>
              </TouchableOpacity>
              <View style={styles.row3}>
                <TouchableOpacity style={[styles.soft, styles.doneButton]} onPress={() => decide('Erledigt ✓')} disabled={busy}>
                  <Text style={[styles.softText, { color: GREEN_TEXT }]}>Schon erledigt</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.soft} onPress={() => setLaterOpen(true)} disabled={busy}>
                  <Text style={styles.softText}>Später …</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.soft} onPress={() => decide('Losgelassen')} disabled={busy}>
                  <Text style={styles.softText}>Loslassen</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          <Text style={styles.footnote}>Loslassen ist auch eine Entscheidung.</Text>
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          <View style={styles.doneCard}>
            <Text style={styles.doneTitle}>{log.length > 0 ? 'Alles entschieden' : 'Nichts wartet'}</Text>
            <Text style={styles.doneText}>
              {log.length > 0
                ? 'Nichts schleppst du unbemerkt mit. Die Woche kann kommen.'
                : 'Alle Aufgaben haben einen Platz. Gut so.'}
            </Text>
          </View>
          {log.map((r, i) => (
            <View key={i} style={styles.logRow}>
              <Text style={{ flex: 1, fontSize: 14 }}>{r.title}</Text>
              <Text style={styles.logChoice}>{r.choice}</Text>
            </View>
          ))}
          <TouchableOpacity style={styles.primary} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={styles.primaryText}>Fertig</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
  container: { flex: 1, backgroundColor: '#fff', padding: 20, paddingTop: 52, gap: 16 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  header: { fontSize: 22, fontWeight: '600' },
  progress: { fontSize: 13, color: MUTED_TEXT, marginTop: 2 },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: SKY.soft, justifyContent: 'center', alignItems: 'center' },
  segments: { flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 5, borderRadius: 3, backgroundColor: '#e5e5ea' },
  segmentDone: { backgroundColor: SKY.button },
  segmentNow: { backgroundColor: '#7fb0e6' },
  card: { backgroundColor: '#f7f7f8', borderRadius: 20, paddingVertical: 28, paddingHorizontal: 20, gap: 8, minHeight: 180, justifyContent: 'center' },
  cardTitle: { fontSize: 24, fontWeight: '700', lineHeight: 30 },
  cardMeta: { fontSize: 14, color: '#4a4a4f' },
  question: { fontSize: 15, fontWeight: '600' },
  primary: { minHeight: 52, borderRadius: 14, backgroundColor: SKY.button, justifyContent: 'center', alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  row3: { flexDirection: 'row', gap: 8 },
  soft: { flex: 1, minHeight: 52, borderRadius: 14, backgroundColor: SKY.soft, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  doneButton: { backgroundColor: '#e3f7e8' },
  softText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  textButton: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  textButtonText: { fontSize: 14, color: SKY.text },
  footnote: { fontSize: 12.5, color: MUTED_TEXT, textAlign: 'center' },
  doneCard: { backgroundColor: '#e3f7e8', borderRadius: 20, padding: 20 },
  doneTitle: { fontSize: 22, fontWeight: '700' },
  doneText: { fontSize: 14, color: '#1f5a2c', marginTop: 6, lineHeight: 20 },
  logRow: { flexDirection: 'row', gap: 12, backgroundColor: '#f7f7f8', borderRadius: 12, padding: 12 },
  logChoice: { fontSize: 14, color: '#4a4a4f' },
});
