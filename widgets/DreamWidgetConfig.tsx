import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WidgetConfigurationScreenProps, WidgetPreview } from 'react-native-android-widget';
import { dreamColor, isOpen } from '../lib/dreams';
import { DreamWidget, DreamWidgetMode, WIDGET_VARIANTS } from './DreamWidget';
import { getWidgetConfig, loadDreams, resolveDream, saveWidgetConfig, WidgetData } from './dream-widget-data';
import { getWidgetImage, WidgetImage } from './widget-images';
import { BLUE, CARD_BG, DANGER_TEXT, MUTED_TEXT, TEXT } from '../constants/theme';

/**
 * Öffnet sich beim Platzieren des Traum-Widgets (und über "Widget
 * konfigurieren"): Modus "Wechselnd" (Traum des Tages) oder "Fester Traum".
 * Läuft als eigener Screen außerhalb des expo-router-Baums.
 */
export function DreamWidgetConfig({ widgetInfo, renderWidget, setResult }: WidgetConfigurationScreenProps) {
  const [data, setData] = useState<WidgetData | null | undefined>(undefined);
  const [mode, setMode] = useState<DreamWidgetMode>('rotate');
  const [dreamId, setDreamId] = useState<string | undefined>(undefined);
  const [previewError, setPreviewError] = useState<string | null>(null);
  // Foto der Vorschau, gemerkt mit dem Traum/Foto, zu dem es gehört.
  const [loadedImage, setLoadedImage] = useState<{ key: string; image: WidgetImage | null } | null>(null);
  const variant = WIDGET_VARIANTS[widgetInfo.widgetName] ?? 'standard';

  // Diagnose: WidgetPreview zeigt nur "Error rendering widget, see logs" und
  // schreibt den echten Fehler per console.error — hier abfangen und anzeigen.
  useEffect(() => {
    const original = console.error;
    console.error = (...args: unknown[]) => {
      const first = args[0] as { message?: string } | undefined;
      setPreviewError(String(first?.message ?? first));
      original(...args);
    };
    return () => {
      console.error = original;
    };
  }, []);

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
  const previewDreamId = preview.dream?.id;
  const imageKey = `${previewDreamId}|${preview.dream?.image_url}`;
  const previewImage = loadedImage?.key === imageKey ? loadedImage.image : null;

  useEffect(() => {
    let cancelled = false;
    const dream = data?.dreams.find((d) => d.id === previewDreamId) ?? null;
    getWidgetImage(dream).then((image) => {
      if (!cancelled) setLoadedImage({ key: imageKey, image });
    });
    return () => {
      cancelled = true;
    };
  }, [data, previewDreamId, imageKey]);
  const defaultSize = { standard: [320, 154], small: [154, 154], row: [320, 64], mini: [72, 72] }[variant];
  const previewWidth = Math.round(Math.min(widgetInfo.width > 0 ? widgetInfo.width : defaultSize[0], 320));
  const previewHeight = Math.round(Math.min(widgetInfo.height > 0 ? widgetInfo.height : defaultSize[1], 180));

  async function confirm() {
    await saveWidgetConfig(widgetInfo.widgetId, config);
    renderWidget(
      <DreamWidget dream={preview.dream} step={preview.step} image={previewImage} mode={mode} state={preview.state} width={widgetInfo.width} height={widgetInfo.height} variant={variant} />
    );
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
            renderWidget={() => (
              <DreamWidget dream={preview.dream} step={preview.step} image={previewImage} mode={mode} state={preview.state} width={previewWidth} height={previewHeight} variant={variant} />
            )}
          />
        </View>
        {previewError && (
          <Text selectable style={styles.diagnostic}>
            Diagnose ({widgetInfo.widgetName}, {previewWidth}×{previewHeight}, Info {widgetInfo.width}×{widgetInfo.height}): {previewError}
          </Text>
        )}
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
  header: { fontSize: 22, fontWeight: '600', color: TEXT },
  lead: { fontSize: 13, color: '#555', lineHeight: 19 },
  segment: { flexDirection: 'row', backgroundColor: '#ececee', borderRadius: 10, padding: 3, gap: 4 },
  segmentButton: { flex: 1, minHeight: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  segmentActive: { backgroundColor: '#fff' },
  segmentText: { fontSize: 14, color: '#444' },
  segmentTextActive: { fontWeight: '600', color: TEXT },
  dreamRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 14, borderRadius: 12, borderWidth: 2, borderColor: 'transparent', backgroundColor: CARD_BG },
  dreamTitle: { fontSize: 15, color: TEXT, flex: 1 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: MUTED_TEXT, marginTop: 6 },
  footer: { flexDirection: 'row', gap: 8, padding: 20, paddingBottom: 32, alignItems: 'center' },
  cancel: { minHeight: 48, paddingHorizontal: 12, justifyContent: 'center' },
  confirm: { flex: 1, minHeight: 50, borderRadius: 12, backgroundColor: BLUE, justifyContent: 'center', alignItems: 'center' },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  diagnostic: { fontSize: 11, color: DANGER_TEXT, lineHeight: 16 },
});
