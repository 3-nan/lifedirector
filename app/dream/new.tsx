import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DreamDraft, DreamForm, draftToRow, EMPTY_DRAFT } from '../../components/dream-form';
import { KeyboardAwareScroll } from '../../components/keyboard-aware';
import { supabase } from '../../lib/supabase';
import { refreshDreamWidgets } from '../../lib/widget-bridge';

export default function NewDreamScreen() {
  const router = useRouter();
  const [draft, setDraft] = useState<DreamDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!draft.title.trim()) {
      setError('Gib deinem Traum einen Namen.');
      return;
    }
    setSaving(true);
    setError(null);
    const { data, error: insertError } = await supabase.from('dreams').insert(draftToRow(draft)).select('id').single();
    setSaving(false);
    if (insertError || !data) {
      setError(insertError?.message ?? 'Speichern fehlgeschlagen.');
      return;
    }
    refreshDreamWidgets();
    // Direkt in die Detailansicht, damit Warum/Hindernis/nächster Schritt gleich ergänzt werden können.
    router.replace({ pathname: '/dream/[id]', params: { id: data.id, fresh: '1' } });
  }

  return (
    <KeyboardAwareScroll style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.cancel} onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.cancelText}>Abbrechen</Text>
        </TouchableOpacity>
        <Text style={styles.header}>Neuer Traum</Text>
        <DreamForm draft={draft} onChange={setDraft} showReflection={false} autoFocusTitle />
        <View style={{ gap: 10, marginTop: 8 }}>
          <Text style={styles.hint}>Warum, Gefühl, Hindernis und den nächsten Schritt kannst du danach in Ruhe ergänzen.</Text>
          {error && <Text style={styles.error}>{error}</Text>}
          <TouchableOpacity style={[styles.saveButton, saving && { opacity: 0.6 }]} onPress={save} disabled={saving} activeOpacity={0.7}>
            <Text style={styles.saveText}>Traum anlegen</Text>
          </TouchableOpacity>
        </View>
    </KeyboardAwareScroll>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingTop: 52, paddingBottom: 40, gap: 16 },
  cancel: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', marginBottom: -12 },
  cancelText: { color: '#007aff', fontSize: 16 },
  header: { fontSize: 22, fontWeight: '600' },
  hint: { fontSize: 12.5, color: '#6b6b70', textAlign: 'center', lineHeight: 18 },
  error: { fontSize: 13, color: '#d70015', textAlign: 'center' },
  saveButton: { minHeight: 50, borderRadius: 12, backgroundColor: '#007aff', justifyContent: 'center', alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
