import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { currentStep, dreamColor, HORIZON_LABEL, HORIZON_ORDER, isOpen, loadStepsThisWeek, STAGE_LABEL } from '../../lib/dreams';
import { onDreamImageChanged, PHOTO_PANEL_ALPHA, withAlpha } from '../../lib/dream-image';
import { supabase } from '../../lib/supabase';
import { Dream } from '../../types/dream';
import { ACCENT, BLUE, CARD_BG, MUTED_TEXT, ORANGE_TEXT } from '../../constants/theme';

export default function DreamsScreen() {
  const router = useRouter();
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [stepsThisWeek, setStepsThisWeek] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [{ data }, steps] = await Promise.all([
      supabase.from('dreams').select('*').order('created_at', { ascending: true }),
      loadStepsThisWeek(),
    ]);
    setDreams(data ?? []);
    setStepsThisWeek(steps);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => onDreamImageChanged(() => load()), [load]);

  if (loading) return <ActivityIndicator style={styles.center} />;

  const open = dreams.filter(isOpen);
  const fulfilledCount = dreams.filter((d) => d.stage === 'fulfilled').length;
  const closedCount = dreams.length - open.length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { gap: 14 }]}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Träume</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/dream/new')}
          accessibilityLabel="Neuer Traum"
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      <Text style={styles.lead}>Was du im Leben noch erleben willst — und der nächste kleine Schritt dahin.</Text>

      {open.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Noch keine Träume</Text>
          <Text style={styles.emptyText}>
            Surfen lernen, eine bestimmte Reise, ein Instrument? Leg deinen ersten Traum an — ein Titel reicht für den Anfang.
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/dream/new')} activeOpacity={0.7}>
            <Text style={styles.emptyButtonText}>Ersten Traum anlegen</Text>
          </TouchableOpacity>
        </View>
      )}

      {HORIZON_ORDER.map((horizon) => {
        const group = open.filter((d) => d.horizon === horizon);
        if (group.length === 0) return null;
        return (
          <View key={horizon} style={{ gap: 8 }}>
            <Text style={styles.sectionTitle}>{HORIZON_LABEL[horizon]}</Text>
            <View style={styles.grid}>
              {group.map((dream) => {
                const color = dreamColor(dream.color);
                const step = currentStep(dream, stepsThisWeek);
                const details = (
                  <>
                    <Text style={[styles.stagePill, { color: color.accent }]}>
                      {STAGE_LABEL[dream.stage]}{dream.target_label ? ` · ${dream.target_label}` : ''}
                    </Text>
                    {step ? (
                      <Text style={styles.nextStep} numberOfLines={2}>
                        {step.thisWeek ? 'Diese Woche' : 'Weiter'}: {step.title}
                      </Text>
                    ) : (
                      <Text style={styles.missingStep}>Nächster Schritt fehlt</Text>
                    )}
                  </>
                );
                return (
                  <TouchableOpacity
                    key={dream.id}
                    style={[styles.card, { backgroundColor: color.bg }]}
                    onPress={() => router.push({ pathname: '/dream/[id]', params: { id: dream.id } })}
                    activeOpacity={0.8}
                  >
                    {dream.image_url ? (
                      <>
                        <Image source={{ uri: dream.image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                        <View style={[styles.photoPanel, { backgroundColor: withAlpha(color.bg, PHOTO_PANEL_ALPHA) }]}>
                          <Text style={styles.cardTitle}>{dream.emoji} {dream.title}</Text>
                          {details}
                        </View>
                      </>
                    ) : (
                      <View style={styles.plainContent}>
                        <Text style={styles.emoji}>{dream.emoji}</Text>
                        <Text style={styles.cardTitle}>{dream.title}</Text>
                        {details}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })}

      {closedCount > 0 && (
        <TouchableOpacity style={styles.memoriesLink} onPress={() => router.push('/dream/memories')} activeOpacity={0.7}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#248a3d" />
          <Text style={styles.memoriesText}>
            <Text style={{ fontWeight: '600' }}>
              {fulfilledCount} {fulfilledCount === 1 ? 'Traum' : 'Träume'} erfüllt
            </Text>
            {' · Erinnerungswand'}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={MUTED_TEXT} />
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Abstände im Inhalt statt am ScrollView selbst — sonst schneidet Android unten ab.
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  header: { fontSize: 22, fontWeight: '600' },
  addButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center' },
  lead: { fontSize: 13, color: '#555', lineHeight: 18, marginTop: -8 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: MUTED_TEXT },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  // Feste Höhe, damit Karten mit und ohne Foto in einer Reihe gleich aussehen.
  card: { width: '48.5%', height: 210, borderRadius: 14, overflow: 'hidden', justifyContent: 'flex-end' },
  plainContent: { padding: 12, gap: 6 },
  photoPanel: { margin: 6, borderRadius: 10, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10, gap: 4 },
  emoji: { fontSize: 30 },
  cardTitle: { fontSize: 14, fontWeight: '600' },
  stagePill: { alignSelf: 'flex-start', fontSize: 10.5, fontWeight: '600', backgroundColor: '#fff', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },
  nextStep: { fontSize: 11.5, color: '#444', lineHeight: 15 },
  missingStep: { fontSize: 11.5, color: ORANGE_TEXT, fontWeight: '600' },
  memoriesLink: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 14, backgroundColor: CARD_BG, borderRadius: 12 },
  memoriesText: { flex: 1, fontSize: 14 },
  emptyCard: { backgroundColor: CARD_BG, borderRadius: 14, padding: 16, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptyText: { fontSize: 13, color: '#555', lineHeight: 19 },
  emptyButton: { alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 16, borderRadius: 10, backgroundColor: BLUE, justifyContent: 'center', marginTop: 4 },
  emptyButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
