import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
    CATEGORY_EMOJI,
    CATEGORY_LABEL,
    currentMonthCategory,
    drawChallenge,
    nextStatus,
    SIZE_LABEL,
    SIZE_ORDER,
} from '../../lib/challenges';
import { supabase } from '../../lib/supabase';
import { Challenge, ChallengeStatus } from '../../types/challenge';

const ACCENT = '#34c759';
const ACCENT_BLUE = '#007aff';
const CARD_BG = '#f7f7f8';
const MUTED = '#9a9a9e';

const STATUS_ICON: Record<ChallengeStatus, keyof typeof Ionicons.glyphMap> = {
  open: 'ellipse-outline',
  active: 'play-circle',
  done: 'checkmark-circle',
};
const STATUS_COLOR: Record<ChallengeStatus, string> = {
  open: '#c7c7cc',
  active: ACCENT_BLUE,
  done: ACCENT,
};

export default function ChallengesScreen() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, ChallengeStatus>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: challengeData } = await supabase
      .from('challenges').select('*').eq('active', true).order('created_at', { ascending: true });
    const { data: progressData } = await supabase
      .from('challenge_progress').select('challenge_id, status');

    const map: Record<string, ChallengeStatus> = {};
    progressData?.forEach((p) => { map[p.challenge_id] = p.status as ChallengeStatus; });

    setChallenges(challengeData ?? []);
    setStatusMap(map);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const statusOf = useCallback((id: string) => statusMap[id] ?? 'open', [statusMap]);

  async function setStatus(challenge: Challenge, status: ChallengeStatus) {
    setStatusMap((prev) => ({ ...prev, [challenge.id]: status }));
    const patch: Record<string, unknown> = {
      challenge_id: challenge.id,
      status,
      updated_at: new Date().toISOString(),
      started_at: status === 'active' ? new Date().toISOString() : status === 'open' ? null : undefined,
      completed_at: status === 'done' ? new Date().toISOString() : status === 'open' ? null : undefined,
    };
    await supabase.from('challenge_progress').upsert(patch, { onConflict: 'challenge_id' });
  }

  const monthCategory = useMemo(() => currentMonthCategory(), []);

  function handleDraw() {
    const picked = drawChallenge(challenges, statusOf, monthCategory);
    if (!picked) {
      Alert.alert('Alles erledigt! 🎉', 'Du hast gerade keine offenen Challenges mehr übrig.');
      return;
    }
    Alert.alert(
      `${CATEGORY_EMOJI[picked.category]} ${picked.title}`,
      picked.description ?? 'Los geht\'s?',
      [
        { text: 'Später', style: 'cancel' },
        { text: "Los geht's", onPress: () => setStatus(picked, 'active') },
      ]
    );
  }

  const doneCount = challenges.filter((c) => statusOf(c.id) === 'done').length;
  const activeCount = challenges.filter((c) => statusOf(c.id) === 'active').length;

  if (loading) return <ActivityIndicator style={styles.center} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
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
          <Text style={[styles.statValue, { color: ACCENT_BLUE }]}>{activeCount}</Text>
          <Text style={styles.statLabel}>Aktiv</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{challenges.length}</Text>
          <Text style={styles.statLabel}>Gesamt</Text>
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
                  const status = statusOf(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.card}
                      activeOpacity={0.7}
                      onPress={() => setStatus(item, nextStatus(status))}
                    >
                      <Ionicons name={STATUS_ICON[status]} size={22} color={STATUS_COLOR[status]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cardTitle, status === 'done' && styles.cardTitleDone]}>
                          {CATEGORY_EMOJI[item.category]} {item.title}
                        </Text>
                        {item.description && (
                          <Text style={styles.cardDescription}>{item.description}</Text>
                        )}
                        <View style={styles.badgeRow}>
                          <Text style={styles.badge}>{CATEGORY_LABEL[item.category]}</Text>
                          {item.friend_friendly && <Text style={styles.badge}>👥 mit Freund</Text>}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center' },
  header: { fontSize: 22, fontWeight: '600', marginBottom: 20 },
  monthCard: { backgroundColor: CARD_BG, borderRadius: 12, padding: 16, marginBottom: 16, alignItems: 'center' },
  monthLabel: { fontSize: 12, color: MUTED },
  monthValue: { fontSize: 18, fontWeight: '600', marginTop: 4, marginBottom: 12 },
  drawButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: ACCENT_BLUE, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 18 },
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
  empty: { color: MUTED, marginTop: 20, lineHeight: 20 },
});
