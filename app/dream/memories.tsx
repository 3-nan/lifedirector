import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { dreamColor } from '../../lib/dreams';
import { supabase } from '../../lib/supabase';
import { Dream } from '../../types/dream';

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const MUTED = '#6b6b70';

function monthYear(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Erinnerungswand: erfüllte Träume (neueste zuerst) + bewusst losgelassene. */
export default function MemoriesScreen() {
  const router = useRouter();
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from('dreams').select('*').in('stage', ['fulfilled', 'let_go']);
    setDreams(data ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <ActivityIndicator style={styles.center} />;

  const fulfilled = dreams
    .filter((d) => d.stage === 'fulfilled')
    .sort((a, b) => (b.fulfilled_at ?? '').localeCompare(a.fulfilled_at ?? ''));
  const letGo = dreams.filter((d) => d.stage === 'let_go');
  const open = (id: string) => router.push({ pathname: '/dream/[id]', params: { id } });

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40, gap: 14 }}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()} hitSlop={8}>
        <Ionicons name="chevron-back" size={22} color="#007aff" />
        <Text style={styles.backText}>Träume</Text>
      </TouchableOpacity>
      <Text style={styles.header}>Erfüllt</Text>
      <Text style={styles.lead}>Was du schon erlebt hast. Nicht abgehakt — erinnert.</Text>

      {fulfilled.length === 0 && <Text style={styles.empty}>Noch kein Traum erfüllt — der erste kommt.</Text>}
      {fulfilled.map((dream) => {
        const color = dreamColor(dream.color);
        return (
          <TouchableOpacity key={dream.id} style={[styles.card, { backgroundColor: color.bg }]} onPress={() => open(dream.id)} activeOpacity={0.8}>
            <View style={styles.cardTop}>
              <Text style={styles.emoji}>{dream.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{dream.title}</Text>
                {dream.fulfilled_at && (
                  <Text style={[styles.meta, { color: color.accent }]}>Erfüllt im {monthYear(dream.fulfilled_at)}</Text>
                )}
              </View>
            </View>
            {dream.fulfilled_note ? (
              <Text style={styles.note}>„{dream.fulfilled_note}“</Text>
            ) : (
              <Text style={[styles.addNote, { color: color.accent }]}>Wie war&apos;s? Erinnerung ergänzen</Text>
            )}
          </TouchableOpacity>
        );
      })}

      {letGo.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Losgelassen</Text>
          {letGo.map((dream) => (
            <TouchableOpacity key={dream.id} style={styles.letGoRow} onPress={() => open(dream.id)} activeOpacity={0.8}>
              <Text style={{ fontSize: 22 }}>{dream.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14 }}>{dream.title}</Text>
                <Text style={styles.meta}>Bewusst losgelassen — und das ist okay.</Text>
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 52, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center' },
  back: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginLeft: -6, minHeight: 44, marginBottom: -12 },
  backText: { color: '#007aff', fontSize: 16 },
  header: { fontSize: 22, fontWeight: '600' },
  lead: { fontSize: 13, color: '#555', lineHeight: 18, marginTop: -8 },
  empty: { color: MUTED, fontSize: 14 },
  card: { borderRadius: 14, padding: 14, gap: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emoji: { fontSize: 30 },
  title: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 12, color: MUTED, marginTop: 2 },
  note: { fontSize: 13.5, lineHeight: 20, fontStyle: 'italic', color: '#333' },
  addNote: { fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: MUTED, marginTop: 6 },
  letGoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f7f7f8', borderRadius: 12, padding: 12 },
});
