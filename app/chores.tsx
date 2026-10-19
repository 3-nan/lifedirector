import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CaptureSheet, PostponeSheet } from '../components/chore-sheets';
import { ChoreRow } from '../components/chores-card';
import { OfflineBanner } from '../components/offline-banner';
import { BLUE, GREEN_TEXT, MUTED_TEXT, SKY } from '../constants/theme';
import { ChoreBucket, addDaysStr, choreCounts, decisionList, grouped, letGoChore, weekOf } from '../lib/chores';
import { dateStr, mondayOf } from '../lib/motivation';
import { localToday, todayStr } from '../lib/period';
import { useChores } from '../lib/use-chores';
import { Chore } from '../types/chore';

const SECTIONS: { id: ChoreBucket; title: string }[] = [
  { id: 'today', title: 'HEUTE' },
  { id: 'week', title: 'DIESE WOCHE' },
  { id: 'upcoming', title: 'DEMNÄCHST' },
];

export default function ChoresScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ postpone?: string }>();
  const api = useChores();
  const { load, chores, setAsking } = api;
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [somedayOpen, setSomedayOpen] = useState(false);

  useFocusEffect(useCallback(() => {
    load().finally(() => setLoading(false));
  }, [load]));

  // Aus einer Erinnerung "Morgen" beim dritten Mal: hier nachfragen.
  useEffect(() => {
    const target = params.postpone ? chores.find((c) => c.id === params.postpone) : undefined;
    if (target) {
      setAsking(target);
      router.setParams({ postpone: undefined });
    }
  }, [params.postpone, chores, setAsking, router]);

  function menu(c: Chore) {
    const today = todayStr();
    Alert.alert(c.title, undefined, [
      { text: 'Auf heute', onPress: () => api.toToday(c) },
      { text: 'Auf morgen', onPress: () => api.postpone(c, { day: addDaysStr(today, 1) }) },
      { text: 'Nächste Woche', onPress: () => api.postpone(c, { week: weekOf(addDaysStr(today, 7)) }) },
      { text: 'Loslassen', style: 'destructive', onPress: async () => { await letGoChore(c); api.changed(); } },
      { text: 'Abbrechen', style: 'cancel' },
    ]);
  }

  if (loading) return <ActivityIndicator style={styles.center} />;

  const today = todayStr();
  const groups = grouped(chores, today);
  const waiting = decisionList(chores, today).length;
  const monday = dateStr(mondayOf(localToday()));
  const week = choreCounts(chores, monday, today);

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={BLUE} />
          <Text style={styles.backText}>Heute</Text>
        </TouchableOpacity>
        <Text style={styles.header}>Aufgaben</Text>
        <OfflineBanner canCheckOff />

        {waiting > 0 && (
          <TouchableOpacity style={styles.checkCard} onPress={() => router.push('/chores-review')} activeOpacity={0.8}>
            <View style={{ flex: 1 }}>
              <Text style={styles.checkTitle}>Wochen-Check</Text>
              <Text style={styles.checkSub}>
                {waiting === 1 ? '1 Aufgabe wartet' : `${waiting} Aufgaben warten`} auf eine Entscheidung
              </Text>
            </View>
            <View style={styles.checkPill}><Text style={styles.checkPillText}>2 Min</Text></View>
          </TouchableOpacity>
        )}

        {SECTIONS.map(({ id, title }) =>
          groups[id].length === 0 ? null : (
            <View key={id} style={styles.section}>
              <Text style={styles.sectionTitle}>{title}</Text>
              {groups[id].map((c) => (
                <ChoreRow
                  key={c.id}
                  chore={c}
                  all={chores}
                  onToggle={() => api.toggle(c)}
                  onLongPress={() => menu(c)}
                  action={{ label: '···', onPress: () => menu(c) }}
                />
              ))}
            </View>
          ))}

        {groups.someday.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.somedayHead}
              onPress={() => setSomedayOpen((v) => !v)}
              accessibilityState={{ expanded: somedayOpen }}
            >
              <Text style={styles.sectionTitle}>IRGENDWANN · {groups.someday.length}</Text>
              <Text style={styles.link}>{somedayOpen ? 'Einklappen' : 'Anzeigen'}</Text>
            </TouchableOpacity>
            {somedayOpen
              ? groups.someday.map((c) => (
                  <ChoreRow
                    key={c.id}
                    chore={c}
                    all={chores}
                    onToggle={() => api.toggle(c)}
                    onLongPress={() => menu(c)}
                    action={{ label: '···', onPress: () => menu(c) }}
                  />
                ))
              : <Text style={styles.somedayPreview} numberOfLines={1}>{groups.someday.map((c) => c.title).join(', ')}</Text>}
          </View>
        )}

        {Object.values(groups).every((g) => g.length === 0) && (
          <Text style={styles.empty}>Nichts offen. Notiere, was dir im Kopf herumgeht — dann muss es da nicht bleiben.</Text>
        )}

        {(week.done > 0 || week.letGo > 0) && (
          <Text style={styles.weekLine}>
            Diese Woche: {week.done} erledigt{week.letGo > 0 ? ` · ${week.letGo} bewusst losgelassen` : ''}
          </Text>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setCapturing(true)} accessibilityLabel="Aufgabe notieren" activeOpacity={0.8}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <CaptureSheet visible={capturing} onClose={() => setCapturing(false)} onSave={api.capture} />
      <PostponeSheet chore={api.asking} onClose={() => api.setAsking(null)} onChoose={api.choose} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
  content: { padding: 20, paddingTop: 52, paddingBottom: 110, gap: 14 },
  back: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginLeft: -6, minHeight: 44, marginBottom: -12 },
  backText: { color: BLUE, fontSize: 16 },
  header: { fontSize: 22, fontWeight: '600' },
  checkCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: SKY.bg, borderRadius: 14, padding: 14 },
  checkTitle: { fontSize: 15, fontWeight: '600' },
  checkSub: { fontSize: 13, color: '#4a4a4f', marginTop: 2 },
  checkPill: { minHeight: 36, paddingHorizontal: 12, borderRadius: 10, backgroundColor: SKY.button, justifyContent: 'center' },
  checkPillText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  section: { gap: 6, backgroundColor: '#f7f7f8', borderRadius: 14, padding: 10 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, color: MUTED_TEXT, marginLeft: 2 },
  somedayHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 32 },
  somedayPreview: { fontSize: 13, color: MUTED_TEXT, marginLeft: 2 },
  link: { fontSize: 13, color: SKY.text },
  empty: { fontSize: 14, color: MUTED_TEXT, lineHeight: 20 },
  weekLine: { fontSize: 13, color: GREEN_TEXT, textAlign: 'center' },
  fab: { position: 'absolute', right: 20, bottom: 32, width: 56, height: 56, borderRadius: 28, backgroundColor: SKY.button, justifyContent: 'center', alignItems: 'center', elevation: 4 },
});
