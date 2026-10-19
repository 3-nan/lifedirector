import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useEffect, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAvoidingBottom } from './keyboard-aware';
import { ACCENT, MUTED, MUTED_TEXT, ORANGE_TEXT, SKY, TEXT } from '../constants/theme';
import { DEFAULT_REMIND_TIME, REMIND_TIMES, addDaysStr, dayLabel, targetWeek } from '../lib/chores';
import { todayStr } from '../lib/period';
import { Chore } from '../types/chore';

/** Sheet von unten über dem ganzen Screen (statt `Modal`, damit die Tastatur-Hilfe greift). */
function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  if (!visible) return null;
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Schließen" />
      <KeyboardAvoidingBottom style={styles.sheetWrap}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          {children}
        </View>
      </KeyboardAvoidingBottom>
    </View>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

const WEEKDAY_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

/** "Heute", "Morgen", sonst "Do 23." */
function chipDay(day: string, today: string): string {
  const label = dayLabel(day, today);
  if (label === 'heute' || label === 'morgen') return label[0].toUpperCase() + label.slice(1);
  const d = new Date(`${day}T12:00:00Z`);
  return `${WEEKDAY_SHORT[d.getUTCDay()]} ${d.getUTCDate()}.`;
}

/** Die nächsten zwei Wochen als Tages-Chips — ohne nativen Datepicker (kein neuer Build). */
function DayStrip({ value, onChange, from }: { value: string; onChange: (day: string) => void; from: string }) {
  const today = todayStr();
  const days = Array.from({ length: 14 }, (_, i) => addDaysStr(from, i));
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {days.map((d) => (
        <Chip key={d} label={chipDay(d, today)} selected={value === d} onPress={() => onChange(d)} />
      ))}
    </ScrollView>
  );
}

function TimeRow({ enabled, onToggle, time, onTime }: { enabled: boolean; onToggle: (v: boolean) => void; time: string; onTime: (t: string) => void }) {
  return (
    <View style={styles.remindBox}>
      <View style={styles.remindHead}>
        <Ionicons name="notifications-outline" size={18} color={MUTED_TEXT} />
        <Text style={{ flex: 1, fontSize: 15 }}>Erinnern</Text>
        <Switch value={enabled} onValueChange={onToggle} trackColor={{ true: ACCENT }} accessibilityLabel="Erinnern" />
      </View>
      {enabled && (
        <View style={styles.chipRow}>
          {REMIND_TIMES.map((t) => <Chip key={t} label={t} selected={time === t} onPress={() => onTime(t)} />)}
        </View>
      )}
    </View>
  );
}

export type When = 'today' | 'tomorrow' | 'week' | 'date' | 'someday';

const WHEN: { id: When; label: string; hint: string }[] = [
  { id: 'today', label: 'Heute', hint: 'Steht heute oben auf „Heute“.' },
  { id: 'tomorrow', label: 'Morgen', hint: 'Taucht morgen auf „Heute“ auf.' },
  { id: 'week', label: 'Diese Woche', hint: 'Unter „+ diese Woche“, bis du sie auf heute holst.' },
  { id: 'date', label: 'Datum …', hint: 'Erscheint am gewählten Tag auf „Heute“.' },
  { id: 'someday', label: 'Irgendwann', hint: 'Landet im Speicher, nicht auf „Heute“. Kommt im Wochen-Check wieder.' },
];

export type CaptureResult = { title: string; due_date: string | null; due_week: string | null; remindTime: string | null };

type CaptureProps = { onClose: () => void; onSave: (r: CaptureResult) => Promise<boolean> };

/** Schnell notieren: Titel + "Wann?", optional eine Erinnerung. Geschlossen ungemountet → frisch beim Öffnen. */
export function CaptureSheet({ visible, ...props }: CaptureProps & { visible: boolean }) {
  return visible ? <CaptureBody {...props} /> : null;
}

function CaptureBody({ onClose, onSave }: CaptureProps) {
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState<When>('today');
  const [day, setDay] = useState(addDaysStr(todayStr(), 2));
  const [remind, setRemind] = useState(false);
  const [time, setTime] = useState(DEFAULT_REMIND_TIME);
  const [saving, setSaving] = useState(false);

  const dated = when === 'today' || when === 'tomorrow' || when === 'date';

  async function save() {
    const t = title.trim();
    if (!t || saving) return;
    const today = todayStr();
    const due_date = when === 'today' ? today : when === 'tomorrow' ? addDaysStr(today, 1) : when === 'date' ? day : null;
    setSaving(true);
    const ok = await onSave({ title: t, due_date, due_week: when === 'week' ? targetWeek(today) : null, remindTime: dated && remind ? time : null });
    setSaving(false);
    if (ok) onClose();
  }

  return (
    <Sheet visible onClose={onClose}>
      <View style={styles.sheetHead}>
        <Text style={styles.sheetTitle}>Neue Aufgabe</Text>
        <TouchableOpacity onPress={onClose} style={styles.linkButton}>
          <Text style={styles.link}>Abbrechen</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.input}
        placeholder="Was steht an?"
        placeholderTextColor={MUTED}
        accessibilityLabel="Was steht an?"
        value={title}
        onChangeText={setTitle}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={save}
      />
      <View style={{ gap: 8 }}>
        <Text style={styles.fieldLabel}>Wann?</Text>
        <View style={styles.chipRow}>
          {WHEN.map((w) => <Chip key={w.id} label={w.label} selected={when === w.id} onPress={() => setWhen(w.id)} />)}
        </View>
        {when === 'date' && <DayStrip value={day} onChange={setDay} from={addDaysStr(todayStr(), 2)} />}
        <Text style={styles.hint}>{WHEN.find((w) => w.id === when)!.hint}</Text>
      </View>
      {dated && <TimeRow enabled={remind} onToggle={setRemind} time={time} onTime={setTime} />}
      <TouchableOpacity
        style={[styles.primary, (!title.trim() || saving) && { opacity: 0.4 }]}
        onPress={save}
        disabled={!title.trim() || saving}
        activeOpacity={0.8}
      >
        <Text style={styles.primaryText}>Notieren</Text>
      </TouchableOpacity>
    </Sheet>
  );
}

export type PostponeChoice =
  | { kind: 'smaller'; step: string }
  | { kind: 'plan'; day: string; note: string | null; time: string | null }
  | { kind: 'letGo' }
  | { kind: 'postpone' };

type PostponeProps = { onClose: () => void; onChoose: (c: Chore, choice: PostponeChoice) => Promise<void> };

/** Beim dritten Verschieben: kleiner machen, fester Termin oder loslassen. */
export function PostponeSheet({ chore, ...props }: PostponeProps & { chore: Chore | null }) {
  return chore ? <PostponeBody key={chore.id} chore={chore} {...props} /> : null;
}

function PostponeBody({ chore: c, onClose, onChoose }: PostponeProps & { chore: Chore }) {
  const [pick, setPick] = useState<'smaller' | 'plan' | 'letGo'>('smaller');
  const [step, setStep] = useState('');
  const [day, setDay] = useState(addDaysStr(todayStr(), 1));
  const [note, setNote] = useState('');
  const [remind, setRemind] = useState(true);
  const [time, setTime] = useState(DEFAULT_REMIND_TIME);
  const [busy, setBusy] = useState(false);

  async function choose(choice: PostponeChoice) {
    if (busy) return;
    setBusy(true);
    await onChoose(c, choice);
    setBusy(false);
    onClose();
  }

  const options: { id: typeof pick; title: string; sub: string }[] = [
    { id: 'smaller', title: 'Kleiner machen', sub: 'Ein erster Schritt statt des ganzen Brockens' },
    { id: 'plan', title: 'Fester Termin', sub: 'Tag und Anlass festlegen' },
    { id: 'letGo', title: 'Loslassen', sub: 'Nicht mehr wichtig? Dann darf sie gehen.' },
  ];
  const cta = pick === 'smaller' ? 'Schritt für heute übernehmen' : pick === 'plan' ? 'Termin festlegen' : 'Loslassen';
  const ctaDisabled = busy || (pick === 'smaller' && !step.trim());

  function confirm() {
    if (pick === 'smaller') choose({ kind: 'smaller', step: step.trim() });
    else if (pick === 'plan') choose({ kind: 'plan', day, note: note.trim() || null, time: remind ? time : null });
    else choose({ kind: 'letGo' });
  }

  return (
    <Sheet visible onClose={onClose}>
      <View>
        <Text style={styles.warnLabel}>{c.postponed_count + 1}× VERSCHOBEN</Text>
        <Text style={styles.bigTitle}>{c.title}</Text>
        <Text style={styles.sub}>Ganz normal bei großen Brocken. Statt nochmal zu schieben: was hilft dir weiter?</Text>
      </View>
      <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled">
        {options.map((o) => {
          const on = pick === o.id;
          return (
            <View key={o.id} style={[styles.option, on && styles.optionOn]}>
              <TouchableOpacity
                style={styles.optionHead}
                onPress={() => setPick(o.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                activeOpacity={0.7}
              >
                <View style={[styles.radio, on && styles.radioOn]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>{o.title}</Text>
                  <Text style={styles.optionSub}>{o.sub}</Text>
                </View>
              </TouchableOpacity>
              {on && o.id === 'smaller' && (
                <View style={styles.optionBody}>
                  <Text style={styles.hint}>Erster Schritt, der höchstens 5 Minuten dauert</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: '#fff' }]}
                    placeholder="z.B. Belege-Ordner raussuchen"
                    placeholderTextColor={MUTED}
                    accessibilityLabel="Erster Schritt"
                    value={step}
                    onChangeText={setStep}
                  />
                  <Text style={styles.hint}>Wird deine Aufgabe für heute. „{c.title}“ bleibt als Ziel darüber stehen.</Text>
                </View>
              )}
              {on && o.id === 'plan' && (
                <View style={styles.optionBody}>
                  <DayStrip value={day} onChange={setDay} from={todayStr()} />
                  <TextInput
                    style={[styles.input, { backgroundColor: '#fff' }]}
                    placeholder="Wann genau? z.B. nach dem Frühstück"
                    placeholderTextColor={MUTED}
                    accessibilityLabel="Anlass"
                    value={note}
                    onChangeText={setNote}
                  />
                  <TimeRow enabled={remind} onToggle={setRemind} time={time} onTime={setTime} />
                </View>
              )}
              {on && o.id === 'letGo' && (
                <View style={styles.optionBody}>
                  <Text style={styles.hint}>Verschwindet aus deinen Aufgaben und zählt im Rückblick als Entscheidung, nicht als verpasst.</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
      <TouchableOpacity style={[styles.primary, ctaDisabled && { opacity: 0.4 }]} onPress={confirm} disabled={ctaDisabled} activeOpacity={0.8}>
        <Text style={styles.primaryText}>{cta}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondary} onPress={() => choose({ kind: 'postpone' })} disabled={busy}>
        <Text style={styles.secondaryText}>Trotzdem auf morgen schieben</Text>
      </TouchableOpacity>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 32, gap: 14 },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#d1d1d6', alignSelf: 'center' },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { fontSize: 17, fontWeight: '600' },
  linkButton: { minHeight: 44, justifyContent: 'center' },
  link: { fontSize: 15, color: SKY.text },
  input: { minHeight: 48, borderRadius: 12, backgroundColor: SKY.soft, paddingHorizontal: 14, fontSize: 16, color: TEXT },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: MUTED_TEXT },
  hint: { fontSize: 12.5, color: MUTED_TEXT, lineHeight: 17 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, borderColor: '#d1d1d6', backgroundColor: '#fff', justifyContent: 'center' },
  chipSelected: { backgroundColor: SKY.button, borderColor: SKY.button },
  chipText: { fontSize: 14 },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  remindBox: { backgroundColor: '#f7f7f8', borderRadius: 12, padding: 12, gap: 10 },
  remindHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  primary: { minHeight: 50, borderRadius: 14, backgroundColor: SKY.button, justifyContent: 'center', alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondary: { minHeight: 44, justifyContent: 'center', alignItems: 'center', marginTop: -6 },
  secondaryText: { fontSize: 14, color: MUTED_TEXT },
  warnLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, color: ORANGE_TEXT },
  bigTitle: { fontSize: 22, fontWeight: '700', marginTop: 4 },
  sub: { fontSize: 14, color: '#4a4a4f', marginTop: 6, lineHeight: 20 },
  option: { borderRadius: 14, backgroundColor: '#f7f7f8', borderWidth: 1.5, borderColor: 'transparent' },
  optionOn: { backgroundColor: SKY.bg, borderColor: SKY.button },
  optionHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, minHeight: 56 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#c7c7cc', backgroundColor: '#fff' },
  radioOn: { borderWidth: 6, borderColor: SKY.button },
  optionTitle: { fontSize: 15, fontWeight: '600' },
  optionSub: { fontSize: 13, color: '#4a4a4f', marginTop: 2 },
  optionBody: { paddingHorizontal: 12, paddingBottom: 12, gap: 8 },
});
