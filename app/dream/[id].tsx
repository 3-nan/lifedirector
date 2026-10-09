import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { CelebrationOverlay, CelebrationPayload } from '../../components/celebration';
import { DreamDraft, DreamForm, draftToRow } from '../../components/dream-form';
import { KeyboardAwareScroll } from '../../components/keyboard-aware';
import {
  CelebratedStage,
  completeNextStep,
  dreamColor,
  HORIZON_LABEL,
  isOpen,
  nextStage,
  nextStepToWeeklyTask,
  setStage,
  STAGE_HINT,
  STAGE_LABEL,
  STAGE_ORDER,
  updateDream,
} from '../../lib/dreams';
import { dreamStepLine, stageUpLine } from '../../lib/motivation';
import { isoWeekKey } from '../../lib/period';
import { supabase } from '../../lib/supabase';
import { refreshDreamWidgets } from '../../lib/widget-bridge';
import { Dream, DreamStep } from '../../types/dream';
import { Task } from '../../types/task';
import { BLUE, CARD_BG, DANGER_TEXT, MUTED_TEXT } from '../../constants/theme';

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`;
}

function toDraft(dream: Dream): DreamDraft {
  return {
    title: dream.title,
    emoji: dream.emoji,
    color: dream.color,
    horizon: dream.horizon,
    target_label: dream.target_label ?? '',
    why: dream.why ?? '',
    feeling: dream.feeling ?? '',
    obstacle: dream.obstacle ?? '',
  };
}

export default function DreamDetailScreen() {
  const router = useRouter();
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const [dream, setDream] = useState<Dream | null>(null);
  const [steps, setSteps] = useState<DreamStep[]>([]);
  const [weekTask, setWeekTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DreamDraft | null>(null);
  const [stepInput, setStepInput] = useState('');
  const [editingStep, setEditingStep] = useState(false);
  const [fulfilling, setFulfilling] = useState(false);
  const [fulfilledNote, setFulfilledNote] = useState('');
  const [confirmLetGo, setConfirmLetGo] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [celebration, setCelebration] = useState<CelebrationPayload | null>(null);
  const celebrationKey = useRef(0);

  const load = useCallback(async () => {
    const [{ data: dreamData }, { data: stepData }, { data: taskData }] = await Promise.all([
      supabase.from('dreams').select('*').eq('id', id).single(),
      supabase.from('dream_steps').select('*').eq('dream_id', id).order('created_at', { ascending: true }),
      supabase.from('tasks').select('*').eq('dream_id', id).eq('week_key', isoWeekKey()).eq('done', false).limit(1),
    ]);
    setDream(dreamData ?? null);
    setSteps(stepData ?? []);
    setWeekTask(taskData?.[0] ?? null);
    setLoading(false);
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function celebrate(title: string, line: string) {
    if (!dream) return;
    celebrationKey.current += 1;
    setCelebration({ key: celebrationKey.current, emoji: dream.emoji, title, line, durationMs: 3500 });
  }

  /** Führt eine Schreib-Aktion aus, zeigt Fehler an und lädt danach neu. */
  async function run(action: () => PromiseLike<{ error?: { message: string } | null } | undefined | void>) {
    setBusy(true);
    setError(null);
    const result = await action();
    setBusy(false);
    if (result && 'error' in result && result.error) {
      setError(result.error.message);
      return false;
    }
    await load();
    return true;
  }

  if (loading) return <ActivityIndicator style={styles.center} />;
  if (!dream) {
    return (
      <View style={[styles.center, { padding: 24 }]}>
        <Text style={styles.fieldValue}>Diesen Traum gibt es nicht mehr.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.textButton}>
          <Text style={styles.textButtonText}>Zurück</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const color = dreamColor(dream.color);
  const open = isOpen(dream);
  const upcoming = nextStage(dream.stage);
  const stageIndex = STAGE_ORDER.indexOf(dream.stage);

  async function saveNextStep() {
    const title = stepInput.trim();
    if (!title || !dream) return;
    const ok = await run(() => updateDream(dream.id, { next_step: title }));
    if (ok) {
      setStepInput('');
      setEditingStep(false);
    }
  }

  async function stepToWeek() {
    if (!dream) return;
    await run(() => nextStepToWeeklyTask(dream));
  }

  async function stepDone() {
    if (!dream?.next_step) return;
    const title = dream.title;
    const ok = await run(() => completeNextStep(dream));
    if (ok) celebrate('Ein Schritt näher!', dreamStepLine(title, dream.id + steps.length));
  }

  async function advance() {
    if (!dream || !upcoming) return;
    if (upcoming === 'fulfilled') {
      setFulfilling(true);
      return;
    }
    const ok = await run(() => setStage(dream, upcoming));
    if (ok) celebrate(`${STAGE_LABEL[upcoming]}!`, stageUpLine(upcoming as CelebratedStage, dream.id));
  }

  async function fulfill() {
    if (!dream) return;
    const ok = await run(() => setStage(dream, 'fulfilled', fulfilledNote.trim() || undefined));
    if (ok) {
      setFulfilling(false);
      celebrate('Traum erfüllt!', stageUpLine('fulfilled', dream.id));
    }
  }

  async function letGo() {
    if (!dream) return;
    const ok = await run(() => setStage(dream, 'let_go'));
    if (ok) setConfirmLetGo(false);
  }

  async function reopen() {
    if (!dream) return;
    await run(() => setStage(dream, 'dream'));
  }

  async function saveEdit() {
    if (!dream || !draft) return;
    if (!draft.title.trim()) {
      setError('Gib deinem Traum einen Namen.');
      return;
    }
    const ok = await run(() => updateDream(dream.id, draftToRow(draft)));
    if (ok) setEditing(false);
  }

  async function deleteDream() {
    if (!dream) return;
    setBusy(true);
    const { error: deleteError } = await supabase.from('dreams').delete().eq('id', dream.id);
    setBusy(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    refreshDreamWidgets();
    router.back();
  }

  const reflections: { label: string; value: string | null; italic?: boolean }[] = [
    { label: 'Warum', value: dream.why },
    { label: 'Wie es sich anfühlen wird', value: dream.feeling, italic: true },
    { label: 'Was mich bisher abhält', value: dream.obstacle },
  ];
  const missingReflection = reflections.some((r) => !r.value);

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAwareScroll contentContainerStyle={{ paddingBottom: 48 }}>
          <View style={[styles.hero, { backgroundColor: color.bg }]}>
            <View style={styles.heroNav}>
              <TouchableOpacity style={styles.navButton} onPress={() => router.back()} hitSlop={8}>
                <Ionicons name="chevron-back" size={22} color={BLUE} />
                <Text style={styles.navText}>Träume</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => {
                  if (editing) saveEdit();
                  else {
                    setDraft(toDraft(dream));
                    setEditing(true);
                  }
                }}
                disabled={busy}
                hitSlop={8}
              >
                <Text style={[styles.navText, editing && { fontWeight: '600' }]}>{editing ? 'Fertig' : 'Bearbeiten'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.heroEmoji}>{dream.emoji}</Text>
            <Text style={styles.heroTitle}>{dream.title}</Text>
            <Text style={[styles.heroMeta, { color: color.accent }]}>
              {HORIZON_LABEL[dream.horizon]}
              {dream.target_label ? ` · bis ${dream.target_label}` : ''}
            </Text>
          </View>

          <View style={styles.body}>
            {error && <Text style={styles.error}>{error}</Text>}

            {editing && draft ? (
              <>
                <DreamForm draft={draft} onChange={setDraft} showReflection />
                <TouchableOpacity style={[styles.primaryButton, { backgroundColor: BLUE }]} onPress={saveEdit} disabled={busy} activeOpacity={0.7}>
                  <Text style={styles.primaryButtonText}>Speichern</Text>
                </TouchableOpacity>
                {confirmDelete ? (
                  <View style={styles.confirmBox}>
                    <Text style={styles.confirmText}>Traum mit allen Schritten endgültig löschen? (Loslassen behält ihn als Erinnerung.)</Text>
                    <View style={styles.row}>
                      <TouchableOpacity style={[styles.smallButton, { backgroundColor: DANGER_TEXT }]} onPress={deleteDream} disabled={busy}>
                        <Text style={styles.smallButtonText}>Löschen</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.textButton} onPress={() => setConfirmDelete(false)}>
                        <Text style={styles.textButtonText}>Abbrechen</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.textButton} onPress={() => setConfirmDelete(true)}>
                    <Text style={[styles.textButtonText, { color: DANGER_TEXT }]}>Traum löschen</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                {dream.stage !== 'let_go' && (
                  <View style={{ gap: 6 }}>
                    <View style={styles.progressRow}>
                      {STAGE_ORDER.map((stage, i) => (
                        <View key={stage} style={[styles.progressSegment, { backgroundColor: i <= stageIndex ? color.accent : '#e5e5e7' }]} />
                      ))}
                    </View>
                    <View style={styles.progressLabels}>
                      {STAGE_ORDER.map((stage, i) => (
                        <Text
                          key={stage}
                          style={[styles.progressLabel, i === stageIndex && { color: color.accent, fontWeight: '600' }]}
                        >
                          {stage === 'committed' ? 'Zugesagt' : STAGE_LABEL[stage]}
                        </Text>
                      ))}
                    </View>
                  </View>
                )}

                {open && (
                  <View style={[styles.stepCard, { borderColor: color.accent }]}>
                    <Text style={[styles.stepCardLabel, { color: color.accent }]}>NÄCHSTER SCHRITT</Text>
                    {weekTask ? (
                      <>
                        <Text style={styles.stepTitle}>{weekTask.title}</Text>
                        <Text style={styles.stepHint}>Steht diese Woche auf „Heute“ — abhaken zählt hier automatisch mit.</Text>
                      </>
                    ) : dream.next_step && !editingStep ? (
                      <>
                        <TouchableOpacity
                          onPress={() => {
                            setStepInput(dream.next_step ?? '');
                            setEditingStep(true);
                          }}
                        >
                          <Text style={styles.stepTitle}>{dream.next_step}</Text>
                        </TouchableOpacity>
                        <Text style={styles.stepHint}>{STAGE_HINT[dream.stage]}</Text>
                        <View style={styles.row}>
                          <TouchableOpacity style={[styles.flexButton, { backgroundColor: color.accent }]} onPress={stepToWeek} disabled={busy} activeOpacity={0.7}>
                            <Text style={styles.primaryButtonText}>In diese Woche</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.flexButton, styles.outlineButton]} onPress={stepDone} disabled={busy} activeOpacity={0.7}>
                            <Text style={styles.outlineButtonText}>Schon erledigt</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    ) : (
                      <>
                        <Text style={styles.stepQuestion}>Was ist dein nächster kleiner Schritt?</Text>
                        <Text style={styles.stepHint}>{STAGE_HINT[dream.stage]} Ideal: unter 30 Minuten.</Text>
                        <TextInput
                          style={styles.stepInput}
                          value={stepInput}
                          onChangeText={setStepInput}
                          placeholder="z.B. 3 Angebote vergleichen"
                          placeholderTextColor="#8e8e93"
                          onSubmitEditing={saveNextStep}
                          returnKeyType="done"
                          autoFocus={fresh === '1' && !dream.next_step}
                        />
                        <TouchableOpacity
                          style={[styles.primaryButton, { backgroundColor: color.accent }, !stepInput.trim() && { opacity: 0.4 }]}
                          onPress={saveNextStep}
                          disabled={busy || !stepInput.trim()}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.primaryButtonText}>Schritt festlegen</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}

                {dream.stage === 'fulfilled' && (
                  <View style={[styles.memoryCard, { backgroundColor: color.bg }]}>
                    <Text style={[styles.stepCardLabel, { color: color.accent }]}>
                      ERFÜLLT{dream.fulfilled_at ? ` AM ${formatShortDate(dream.fulfilled_at)}${new Date(dream.fulfilled_at).getFullYear()}` : ''}
                    </Text>
                    <Text style={styles.memoryText}>{dream.fulfilled_note ? `„${dream.fulfilled_note}“` : 'Noch keine Erinnerung notiert — unten ergänzen.'}</Text>
                  </View>
                )}

                <View style={{ gap: 12 }}>
                  {reflections.map((r) =>
                    r.value ? (
                      <View key={r.label}>
                        <Text style={styles.fieldLabel}>{r.label}</Text>
                        <Text style={[styles.fieldValue, r.italic && { fontStyle: 'italic' }]}>{r.value}</Text>
                      </View>
                    ) : null
                  )}
                  {missingReflection && open && (
                    <TouchableOpacity
                      style={styles.reflectPrompt}
                      onPress={() => {
                        setDraft(toDraft(dream));
                        setEditing(true);
                      }}
                    >
                      <Ionicons name="create-outline" size={18} color={MUTED_TEXT} />
                      <Text style={styles.reflectPromptText}>
                        {!dream.why ? 'Warum ist dir das wichtig?' : !dream.obstacle ? 'Was hält dich bisher ab?' : 'Wie wird es sich anfühlen?'} Ergänzen
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {steps.length > 0 && (
                  <View style={{ gap: 6 }}>
                    <Text style={styles.fieldLabel}>Bisherige Schritte</Text>
                    {steps.map((step) => (
                      <View key={step.id} style={styles.stepRow}>
                        <Ionicons
                          name={step.done_at ? 'checkmark' : 'time-outline'}
                          size={16}
                          color={step.done_at ? '#248a3d' : MUTED_TEXT}
                        />
                        <Text style={[styles.stepRowTitle, !step.done_at && { color: MUTED_TEXT }]}>{step.title}</Text>
                        <Text style={styles.stepRowDate}>{step.done_at ? formatShortDate(step.done_at) : 'diese Woche'}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {fulfilling ? (
                  <View style={styles.confirmBox}>
                    <Text style={styles.confirmTitle}>Traum erfüllt — wie war&apos;s?</Text>
                    <TextInput
                      style={[styles.stepInput, { minHeight: 70, textAlignVertical: 'top' }]}
                      value={fulfilledNote}
                      onChangeText={setFulfilledNote}
                      placeholder="Ein, zwei Sätze für deine Erinnerungswand (optional)"
                      placeholderTextColor="#8e8e93"
                      multiline
                      autoFocus
                    />
                    <View style={styles.row}>
                      <TouchableOpacity style={[styles.flexButton, { backgroundColor: '#248a3d' }]} onPress={fulfill} disabled={busy}>
                        <Text style={styles.primaryButtonText}>Als erfüllt markieren</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.textButton} onPress={() => setFulfilling(false)}>
                        <Text style={styles.textButtonText}>Abbrechen</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : confirmLetGo ? (
                  <View style={styles.confirmBox}>
                    <Text style={styles.confirmText}>
                      Loslassen ist ein Abschluss, kein Scheitern. Der Traum wandert in die Erinnerungswand und lässt sich jederzeit wieder aufnehmen.
                    </Text>
                    <View style={styles.row}>
                      <TouchableOpacity style={[styles.smallButton, { backgroundColor: '#444' }]} onPress={letGo} disabled={busy}>
                        <Text style={styles.smallButtonText}>Loslassen</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.textButton} onPress={() => setConfirmLetGo(false)}>
                        <Text style={styles.textButtonText}>Abbrechen</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : open ? (
                  <View style={styles.row}>
                    {upcoming && (
                      <TouchableOpacity style={[styles.flexButton, styles.greyButton]} onPress={advance} disabled={busy}>
                        <Text style={styles.greyButtonText}>Stufe weiter → {STAGE_LABEL[upcoming]}</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={[styles.greyButton, { paddingHorizontal: 14 }]} onPress={() => setConfirmLetGo(true)}>
                      <Text style={[styles.greyButtonText, { color: MUTED_TEXT }]}>Loslassen</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ gap: 8 }}>
                    {dream.stage === 'fulfilled' && (
                      <TouchableOpacity
                        style={[styles.greyButton, { justifyContent: 'center' }]}
                        onPress={() => {
                          setFulfilledNote(dream.fulfilled_note ?? '');
                          setFulfilling(true);
                        }}
                      >
                        <Text style={styles.greyButtonText}>{dream.fulfilled_note ? 'Erinnerung bearbeiten' : 'Erinnerung ergänzen'}</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={[styles.greyButton, { justifyContent: 'center' }]} onPress={reopen} disabled={busy}>
                      <Text style={styles.greyButtonText}>Wieder aufnehmen</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
      </KeyboardAwareScroll>
      <CelebrationOverlay payload={celebration} onDismiss={() => setCelebration(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hero: { paddingHorizontal: 20, paddingTop: 48, paddingBottom: 18, gap: 6 },
  heroNav: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: -6 },
  navButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 },
  navText: { color: BLUE, fontSize: 16 },
  heroEmoji: { fontSize: 44 },
  heroTitle: { fontSize: 24, fontWeight: '700' },
  heroMeta: { fontSize: 13 },
  body: { padding: 20, gap: 16 },
  error: { fontSize: 13, color: DANGER_TEXT },
  progressRow: { flexDirection: 'row', gap: 4 },
  progressSegment: { flex: 1, height: 6, borderRadius: 3 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 10.5, color: MUTED_TEXT },
  stepCard: { borderWidth: 1.5, borderRadius: 14, padding: 14, gap: 10 },
  stepCardLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  stepTitle: { fontSize: 16, fontWeight: '600' },
  stepQuestion: { fontSize: 16, fontWeight: '600' },
  stepHint: { fontSize: 12, color: MUTED_TEXT, lineHeight: 17 },
  stepInput: { minHeight: 44, backgroundColor: CARD_BG, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  flexButton: { flex: 1, minHeight: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  primaryButton: { minHeight: 46, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  outlineButton: { borderWidth: 1.5, borderColor: '#d1d1d6', backgroundColor: '#fff' },
  outlineButtonText: { fontSize: 14 },
  greyButton: { minHeight: 44, borderRadius: 10, backgroundColor: CARD_BG, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  greyButtonText: { fontSize: 13 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: MUTED_TEXT },
  fieldValue: { fontSize: 14, lineHeight: 20, marginTop: 2 },
  reflectPrompt: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#d1d1d6' },
  reflectPromptText: { fontSize: 13, color: MUTED_TEXT, flex: 1 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepRowTitle: { flex: 1, fontSize: 13 },
  stepRowDate: { fontSize: 12, color: MUTED_TEXT },
  memoryCard: { borderRadius: 14, padding: 14, gap: 6 },
  memoryText: { fontSize: 14, lineHeight: 20, fontStyle: 'italic' },
  confirmBox: { backgroundColor: CARD_BG, borderRadius: 12, padding: 14, gap: 10 },
  confirmTitle: { fontSize: 15, fontWeight: '600' },
  confirmText: { fontSize: 13, color: '#444', lineHeight: 19 },
  smallButton: { minHeight: 40, paddingHorizontal: 16, borderRadius: 10, justifyContent: 'center' },
  smallButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  textButton: { minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  textButtonText: { fontSize: 14, color: BLUE },
});
