import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { DREAM_COLORS, DREAM_EMOJIS, HORIZON_LABEL, HORIZON_ORDER } from '../lib/dreams';
import { DreamHorizon } from '../types/dream';

export type DreamDraft = {
  title: string;
  emoji: string;
  color: string;
  horizon: DreamHorizon;
  target_label: string;
  why: string;
  feeling: string;
  obstacle: string;
};

export const EMPTY_DRAFT: DreamDraft = {
  title: '',
  emoji: '✨',
  color: 'blue',
  horizon: 'someday',
  target_label: '',
  why: '',
  feeling: '',
  obstacle: '',
};

/** Leere Freitext-Felder als `null` speichern statt als leeren String. */
export function draftToRow(draft: DreamDraft) {
  const orNull = (v: string) => (v.trim() ? v.trim() : null);
  return {
    title: draft.title.trim(),
    emoji: draft.emoji,
    color: draft.color,
    horizon: draft.horizon,
    target_label: orNull(draft.target_label),
    why: orNull(draft.why),
    feeling: orNull(draft.feeling),
    obstacle: orNull(draft.obstacle),
  };
}

const MUTED = '#6b6b70';

/**
 * Formular für Anlegen und Bearbeiten. Beim Anlegen nur das Nötigste
 * (`showReflection` aus) — Warum/Gefühl/Hindernis kommen später dazu.
 */
export function DreamForm({
  draft,
  onChange,
  showReflection,
  autoFocusTitle,
}: {
  draft: DreamDraft;
  onChange: (next: DreamDraft) => void;
  showReflection: boolean;
  autoFocusTitle?: boolean;
}) {
  const set = <K extends keyof DreamDraft>(key: K, value: DreamDraft[K]) => onChange({ ...draft, [key]: value });

  return (
    <View style={{ gap: 18 }}>
      <View style={styles.field}>
        <Text style={styles.label}>Was willst du erleben?</Text>
        <TextInput
          style={styles.titleInput}
          value={draft.title}
          onChangeText={(v) => set('title', v)}
          placeholder="z.B. Surfen lernen"
          placeholderTextColor="#8e8e93"
          autoFocus={autoFocusTitle}
          returnKeyType="done"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Symbol</Text>
        <View style={styles.wrapRow}>
          {DREAM_EMOJIS.map((emoji) => {
            const selected = emoji === draft.emoji;
            return (
              <TouchableOpacity
                key={emoji}
                style={[styles.emojiButton, selected && { borderColor: DREAM_COLORS[draft.color]?.accent ?? '#007aff', backgroundColor: DREAM_COLORS[draft.color]?.bg }]}
                onPress={() => set('emoji', emoji)}
                accessibilityLabel={`Symbol ${emoji}`}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Farbe</Text>
        <View style={styles.colorRow}>
          {Object.entries(DREAM_COLORS).map(([name, c]) => (
            <TouchableOpacity
              key={name}
              style={[styles.colorDot, { backgroundColor: c.bg, borderColor: name === draft.color ? '#1c1c1e' : c.accent }]}
              onPress={() => set('color', name)}
              accessibilityLabel={`Farbe ${name}${name === draft.color ? ', ausgewählt' : ''}`}
            >
              <View style={[styles.colorInner, { backgroundColor: c.accent }]} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Wann ungefähr?</Text>
        <View style={styles.wrapRow}>
          {HORIZON_ORDER.map((h) => {
            const selected = h === draft.horizon;
            return (
              <TouchableOpacity key={h} style={[styles.chip, selected && styles.chipSelected]} onPress={() => set('horizon', h)}>
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{HORIZON_LABEL[h]}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>
          Bis … <Text style={{ fontWeight: '400', color: MUTED }}>(optional)</Text>
        </Text>
        <TextInput
          style={styles.input}
          value={draft.target_label}
          onChangeText={(v) => set('target_label', v)}
          placeholder="z.B. Sommer 2027 oder vor meinem 40."
          placeholderTextColor="#8e8e93"
        />
      </View>

      {showReflection && (
        <>
          <View style={styles.field}>
            <Text style={styles.label}>Warum ist dir das wichtig?</Text>
            <TextInput style={[styles.input, styles.multiline]} value={draft.why} onChangeText={(v) => set('why', v)} multiline placeholder="Was dir dieser Traum bedeutet" placeholderTextColor="#8e8e93" />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Wie wird es sich anfühlen?</Text>
            <TextInput style={[styles.input, styles.multiline]} value={draft.feeling} onChangeText={(v) => set('feeling', v)} multiline placeholder="Stell dir den Moment so lebendig wie möglich vor" placeholderTextColor="#8e8e93" />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Was hält dich bisher ab?</Text>
            <TextInput style={[styles.input, styles.multiline]} value={draft.obstacle} onChangeText={(v) => set('obstacle', v)} multiline placeholder="Ehrlich: Zeit, Geld, Mut, kein Plan …" placeholderTextColor="#8e8e93" />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: '#555' },
  titleInput: { minHeight: 48, borderWidth: 1.5, borderColor: '#007aff', borderRadius: 10, paddingHorizontal: 14, fontSize: 16 },
  input: { minHeight: 44, backgroundColor: '#f7f7f8', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  multiline: { minHeight: 64, textAlignVertical: 'top' },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  emojiButton: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#f7f7f8', borderWidth: 2, borderColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
  emojiText: { fontSize: 22 },
  colorRow: { flexDirection: 'row', gap: 10 },
  colorDot: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  colorInner: { width: 14, height: 14, borderRadius: 7 },
  chip: { minHeight: 36, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#ececee', justifyContent: 'center' },
  chipSelected: { backgroundColor: '#248a3d' },
  chipText: { fontSize: 13, color: '#444' },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
});
