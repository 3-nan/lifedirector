import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WidgetConfigurationScreenProps, WidgetPreview } from 'react-native-android-widget';
import { dreamColor, isOpen } from '../lib/dreams';
import { DreamWidget, DreamWidgetMode } from './DreamWidget';
import { getWidgetConfig, loadDreams, resolveDream, saveWidgetConfig, WidgetData } from './dream-widget-data';

const BLUE = '#007aff';
const MUTED = '#6b6b70';

/**
 * Öffnet sich beim Platzieren des Traum-Widgets (und über "Widget
 * konfigurieren"): Modus "Wechselnd" (Traum des Tages) oder "Fester Traum".
 * Läuft als eigener Screen außerhalb des expo-router-Baums.
 */
export function DreamWidgetConfig({ widgetInfo, renderWidget, setResult }: WidgetConfigurationScreenProps) {
  const [data, setData] = useState<WidgetData | null | undefined>(undefined);
  const [mode, setMode] = useState<DreamWidgetMode>('rotate');
  const [dreamId, setDreamId] = useState<string | undefined>(undefined);

  useEffect(() => {
    Promise.all([loadDreams(), getWidgetConfig(widgetInfo.widgetId)]).then(([loaded, config]) => {
      setData(loaded);
      setMode(config.mode);
      setDreamId(config.dreamId);
    });
  }, [widgetInfo.widgetId]);

  const openDreams = (data?.dreams ?? []).filter(isOpen);
  const selectedId = dreamId ?? openDreams[0]?.id;
  const config = mode === 'fixed' ? { mode, dreamId: selectedId } : { mode };
  const preview = resolveDream(data ?? null, config);
  const previewWidth = Math.min(widgetInfo.width || 320, 320);
  const previewHeight = Math.min(widgetInfo.height || 154, 180);

  async function confirm() {
    await saveWidgetConfig(widgetInfo.widgetId, config);
    renderWidget(<DreamWidget dream={preview.dream} step={preview.step} mode={mode} state={preview.state} width={widgetInfo.width} />);
    setResult('ok');
  }

  if (data === undefined) return <ActivityIndicator style={styles.center} />;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Traum-Widget einrichten</Text>

        <View style={styles.segment}>
          {(['rotate', 'fixed'] as const).map((m) => (
            <TouchableOpacity key={m} style={[styles.segmentButton, mode === m && styles.segmentActive]} onPress={() => setMode(m)}>
              <Text style={[styles.segmentText, mode === m && styles.segmentTextActive]}>
                {m === 'rotate' ? 'Wechselnd (täglich)' : 'Fester Traum'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.lead}>
          {mode === 'rotate'
            ? 'Jeden Tag ein anderer deiner Träume — so bleiben alle präsent.'
            : 'Immer derselbe Traum. Du kannst mehrere Widgets mit verschiedenen Träumen platzieren.'}
        </Text>

        {data === null && (
          <Text style={styles.lead}>Öffne LifeDirector einmal, damit das Widget deine Träume laden kann.</Text>
        )}

        {mode === 'fixed' && (
          <View style={{ gap: 8 }}>
            {openDreams.length === 0 && data !== null && <Text style={styles.lead}>Noch keine offenen Träume.</Text>}
            {openDreams.map((d) => {
              const selected = d.id === selectedId;
              return (
                <TouchableOpacity
                  key={d.id}
                  style={[styles.dreamRow, selected && { borderColor: BLUE, backgroundColor: dreamColor(d.color).bg }]}
                  onPress={() => setDreamId(d.id)}
                >
                  <Text style={{ fontSize: 24 }}>{d.emoji}</Text>
                  <Text style={[styles.dreamTitle, selected && { fontWeight: '600' }]}>{d.title}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Text style={styles.sectionTitle}>Vorschau</Text>
        <View style={{ alignItems: 'center' }}>
          <WidgetPreview
            width={previewWidth}
            height={previewHeight}
            renderWidget={() => <DreamWidget dream={preview.dream} step={preview.step} mode={mode} state={preview.state} width={previewWidth} />}
          />
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancel} onPress={() => setResult('cancel')}>
          <Text style={{ color: BLUE, fontSize: 16 }}>Abbrechen</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.confirm} onPress={confirm}>
          <Text style={styles.confirmText}>Widget hinzufügen</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
  screen: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingTop: 48, gap: 14 },
  header: { fontSize: 22, fontWeight: '600', color: '#1c1c1e' },
  lead: { fontSize: 13, color: '#555', lineHeight: 19 },
  segment: { flexDirection: 'row', backgroundColor: '#ececee', borderRadius: 10, padding: 3, gap: 4 },
  segmentButton: { flex: 1, minHeight: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  segmentActive: { backgroundColor: '#fff' },
  segmentText: { fontSize: 14, color: '#444' },
  segmentTextActive: { fontWeight: '600', color: '#1c1c1e' },
  dreamRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 14, borderRadius: 12, borderWidth: 2, borderColor: 'transparent', backgroundColor: '#f7f7f8' },
  dreamTitle: { fontSize: 15, color: '#1c1c1e', flex: 1 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: MUTED, marginTop: 6 },
  footer: { flexDirection: 'row', gap: 8, padding: 20, paddingBottom: 32, alignItems: 'center' },
  cancel: { minHeight: 48, paddingHorizontal: 12, justifyContent: 'center' },
  confirm: { flex: 1, minHeight: 50, borderRadius: 12, backgroundColor: BLUE, justifyContent: 'center', alignItems: 'center' },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
