import { Ionicons } from '@expo/vector-icons';
import { Session } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  countOwnHabits,
  deleteMyAccount,
  isSecured,
  requestSecureCode,
  requestSignInCode,
  signOutToFreshAccount,
  verifySecureCode,
  verifySignInCode,
} from '../lib/account';
import { supabase } from '../lib/supabase';

const BLUE = '#007aff';
const GREEN_TEXT = '#1f7a35';
const ORANGE_TEXT = '#b25900';
const DANGER = '#d70015';
const CARD_BG = '#f7f7f8';
const MUTED = '#8e8e93';

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;
const DELETE_WORD = 'LÖSCHEN';

type Flow = 'secure' | 'signIn';
type View_ = 'main' | 'email' | 'code' | 'delete';

/** Supabase-Fehler in verständliche Sätze übersetzen, statt englischer Rohmeldungen. */
function friendlyError(error: unknown, flow: Flow | null): string {
  const e = error as { code?: string; message?: string; status?: number };
  const code = e?.code ?? '';
  const message = (e?.message ?? '').toLowerCase();
  if (code === 'otp_expired' || message.includes('expired') || message.includes('invalid')) {
    return 'Code falsch oder abgelaufen. Prüf die Ziffern oder fordere einen neuen an.';
  }
  if (code === 'over_email_send_rate_limit' || e?.status === 429 || message.includes('rate limit')) {
    return 'Zu viele Versuche — bitte kurz warten und dann nochmal.';
  }
  if (code === 'email_exists' || message.includes('already been registered')) {
    return 'Diese E-Mail gehört schon zu einem gesicherten Konto. Melde dich stattdessen damit an.';
  }
  if (flow === 'signIn' && (code === 'otp_disabled' || message.includes('signups not allowed'))) {
    return 'Zu dieser E-Mail gibt es noch kein gesichertes Konto.';
  }
  if (message.includes('error sending')) {
    return 'Die E-Mail konnte gerade nicht verschickt werden. Bitte später nochmal versuchen.';
  }
  if (code === 'email_address_invalid' || message.includes('invalid format')) {
    return 'Das sieht nicht nach einer gültigen E-Mail aus.';
  }
  return e?.message ?? 'Etwas ist schiefgelaufen. Bitte nochmal versuchen.';
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function SettingsScreen() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState<View_>('main');
  const [flow, setFlow] = useState<Flow | null>(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSecured, setJustSecured] = useState(false);
  const [localHabitCount, setLocalHabitCount] = useState(0);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [deleteWord, setDeleteWord] = useState('');
  const [counts, setCounts] = useState<{ label: string; count: number }[]>([]);
  const codeInput = useRef<TextInput>(null);

  useEffect(() => {
    // refreshSession statt nur getSession: holt den aktuellen Stand vom Server,
    // z.B. wenn die E-Mail per Link in der Mail statt per Code bestätigt wurde.
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    supabase.auth.refreshSession().then(({ data }) => {
      if (data.session) setSession(data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Countdown für "Code erneut senden" — tickt nur, solange er läuft.
  useEffect(() => {
    if (view !== 'code' || now >= resendAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [view, now, resendAt]);

  const secured = isSecured(session);

  function go(next: View_) {
    setError(null);
    setView(next);
  }

  function startFlow(next: Flow) {
    setFlow(next);
    setEmail('');
    setCode('');
    setJustSecured(false);
    if (next === 'signIn') countOwnHabits().then(setLocalHabitCount);
    go('email');
  }

  async function sendCode() {
    if (!flow || !isEmail(email)) {
      setError('Das sieht nicht nach einer gültigen E-Mail aus.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (flow === 'secure') await requestSecureCode(email);
      else await requestSignInCode(email);
      setCode('');
      setResendAt(Date.now() + RESEND_SECONDS * 1000);
      setNow(Date.now());
      go('code');
      setTimeout(() => codeInput.current?.focus(), 250);
    } catch (e) {
      setError(friendlyError(e, flow));
    } finally {
      setBusy(false);
    }
  }

  async function confirmCode(value: string) {
    if (!flow || value.length !== CODE_LENGTH) return;
    setBusy(true);
    setError(null);
    try {
      if (flow === 'secure') {
        await verifySecureCode(email, value);
        setJustSecured(true);
        go('main');
      } else {
        await verifySignInCode(email, value);
        // Anderer Account → Heute lädt beim Zurückkehren dessen Daten.
        router.back();
      }
    } catch (e) {
      setError(friendlyError(e, flow));
      setCode('');
    } finally {
      setBusy(false);
    }
  }

  function onCodeChange(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    if (digits.length === CODE_LENGTH) confirmCode(digits);
  }

  async function openDelete() {
    setDeleteWord('');
    go('delete');
    const tables: { table: string; label: string }[] = [
      { table: 'habits', label: 'Habits mit Verlauf' },
      { table: 'tasks', label: 'Wochen-Tasks' },
      { table: 'monthly_goals', label: 'Monatsziele' },
      { table: 'challenge_progress', label: 'Challenge-Fortschritt' },
    ];
    const results = await Promise.all(
      tables.map(async ({ table, label }) => {
        const { count } = await supabase.from(table).select('id', { count: 'exact', head: true });
        return { label, count: count ?? 0 };
      })
    );
    setCounts(results);
  }

  async function confirmDelete() {
    setBusy(true);
    setError(null);
    try {
      await deleteMyAccount();
      router.back();
    } catch (e) {
      setError(friendlyError(e, null));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    try {
      await signOutToFreshAccount();
      router.back();
    } finally {
      setBusy(false);
    }
  }

  const backLabel = view === 'main' ? 'Heute' : view === 'code' ? 'Zurück' : 'Einstellungen';
  function onBack() {
    if (view === 'main') router.back();
    else if (view === 'code') go('email');
    else go('main');
  }

  const secondsLeft = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const version = Constants.expoConfig?.version ?? '';

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.back} onPress={onBack} hitSlop={8} disabled={busy}>
          <Ionicons name="chevron-back" size={22} color={BLUE} />
          <Text style={styles.backText}>{backLabel}</Text>
        </TouchableOpacity>

        {view === 'main' && (
          <>
            <Text style={styles.header}>Einstellungen</Text>

            {justSecured && (
              <View style={styles.successBanner}>
                <Ionicons name="checkmark" size={18} color={GREEN_TEXT} />
                <Text style={styles.successText}>Konto gesichert — deine Daten sind sicher.</Text>
              </View>
            )}

            <Text style={styles.sectionTitle}>Konto</Text>
            <View style={styles.card}>
              <View style={styles.statusRow}>
                <View style={[styles.statusIcon, { backgroundColor: secured ? '#e8f8ec' : '#fff0e0' }]}>
                  <Ionicons
                    name={secured ? 'shield-checkmark-outline' : 'shield-outline'}
                    size={20}
                    color={secured ? GREEN_TEXT : ORANGE_TEXT}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statusTitle}>{secured ? 'Gesichert' : 'Nicht gesichert'}</Text>
                  {secured && <Text style={styles.statusEmail}>{session?.user.email}</Text>}
                  <Text style={styles.body}>
                    {secured
                      ? 'Auf einem neuen Handy einfach mit dieser E-Mail anmelden — alles ist wieder da.'
                      : 'Deine Daten sind nur mit diesem Handy verknüpft. Wenn du die App löschst oder das Handy wechselst, sind sie weg.'}
                  </Text>
                </View>
              </View>
              {secured ? (
                <TouchableOpacity style={styles.outlineButton} onPress={signOut} disabled={busy} activeOpacity={0.7}>
                  <Text style={styles.outlineButtonText}>Abmelden</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.primaryButton} onPress={() => startFlow('secure')} activeOpacity={0.7}>
                  <Text style={styles.primaryButtonText}>Mit E-Mail sichern</Text>
                </TouchableOpacity>
              )}
            </View>
            {!secured && (
              <TouchableOpacity style={styles.rowLink} onPress={() => startFlow('signIn')} activeOpacity={0.7}>
                <Text style={styles.rowLinkText}>Schon gesichert? Hier anmelden</Text>
                <Ionicons name="chevron-forward" size={16} color={MUTED} />
              </TouchableOpacity>
            )}

            <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Daten</Text>
            <TouchableOpacity style={styles.rowLink} onPress={openDelete} activeOpacity={0.7}>
              <Text style={[styles.rowLinkText, { color: DANGER }]}>Alle meine Daten löschen</Text>
              <Ionicons name="chevron-forward" size={16} color={MUTED} />
            </TouchableOpacity>

            <Text style={styles.version}>LifeDirector {version}</Text>
          </>
        )}

        {view === 'email' && (
          <>
            <Text style={styles.header}>{flow === 'secure' ? 'Konto sichern' : 'Anmelden'}</Text>
            <Text style={styles.lead}>
              {flow === 'secure'
                ? 'Wir schicken dir einen 6-stelligen Code. Kein Passwort, nichts zu merken.'
                : 'Mit der E-Mail, mit der du dein Konto gesichert hast. Danach ist alles wieder da.'}
            </Text>
            <Text style={styles.label}>E-Mail</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="du@beispiel.de"
              placeholderTextColor={MUTED}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              autoFocus
              returnKeyType="send"
              onSubmitEditing={sendCode}
            />
            {flow === 'signIn' && localHabitCount > 0 && (
              <View style={styles.warning}>
                <Ionicons name="warning-outline" size={18} color={ORANGE_TEXT} />
                <Text style={styles.warningText}>
                  Auf diesem Handy gibt es schon ungesicherte Daten ({localHabitCount} {localHabitCount === 1 ? 'Habit' : 'Habits'}).
                  Beim Anmelden werden sie durch dein gesichertes Konto ersetzt.
                </Text>
              </View>
            )}
            {error && <Text style={styles.error}>{error}</Text>}
            <TouchableOpacity style={styles.primaryButton} onPress={sendCode} disabled={busy} activeOpacity={0.7}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Code senden</Text>}
            </TouchableOpacity>
            {flow === 'secure' && (
              <View style={styles.infoBox}>
                <Ionicons name="checkmark-circle-outline" size={18} color={GREEN_TEXT} />
                <Text style={styles.infoText}>
                  Alles bleibt, wie es ist — Habits, Streaks, Challenges. Du kannst sie danach nur auch auf einem anderen Handy wiederfinden.
                </Text>
              </View>
            )}
          </>
        )}

        {view === 'code' && (
          <>
            <Text style={styles.header}>Code eingeben</Text>
            <Text style={styles.lead}>
              Gesendet an <Text style={{ fontWeight: '600', color: '#1c1c1e' }}>{email.trim()}</Text>. Schau auch im Spam-Ordner nach.
            </Text>
            <Text style={styles.label}>6-stelliger Code</Text>
            <Pressable style={styles.codeRow} onPress={() => codeInput.current?.focus()}>
              {Array.from({ length: CODE_LENGTH }, (_, i) => (
                <View key={i} style={[styles.codeBox, i === code.length && styles.codeBoxActive]}>
                  <Text style={styles.codeDigit}>{code[i] ?? ''}</Text>
                </View>
              ))}
              <TextInput
                ref={codeInput}
                style={styles.hiddenInput}
                value={code}
                onChangeText={onCodeChange}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                maxLength={CODE_LENGTH}
                caretHidden
              />
            </Pressable>
            {error && <Text style={styles.error}>{error}</Text>}
            <TouchableOpacity
              style={[styles.primaryButton, code.length < CODE_LENGTH && styles.buttonDisabled]}
              onPress={() => confirmCode(code)}
              disabled={busy || code.length < CODE_LENGTH}
              activeOpacity={0.7}
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Bestätigen</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.textButton} onPress={sendCode} disabled={busy || secondsLeft > 0}>
              <Text style={[styles.textButtonText, { color: secondsLeft > 0 ? '#6b6b70' : BLUE }]}>
                {secondsLeft > 0
                  ? `Code erneut senden (${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')})`
                  : 'Code erneut senden'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.textButton} onPress={() => go('email')} disabled={busy}>
              <Text style={styles.textButtonText}>Andere E-Mail verwenden</Text>
            </TouchableOpacity>
          </>
        )}

        {view === 'delete' && (
          <>
            <Text style={styles.header}>Alle Daten löschen</Text>
            <Text style={styles.lead}>Das löscht dein Konto und alles darin. Es lässt sich nicht rückgängig machen.</Text>
            <View style={[styles.card, { gap: 8 }]}>
              {counts.length === 0 && <ActivityIndicator />}
              {counts.map(({ label, count }) => (
                <View key={label} style={styles.countRow}>
                  <Text style={styles.countLabel}>{label}</Text>
                  <Text style={styles.countValue}>{count}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.label}>Zur Bestätigung {DELETE_WORD} eintippen</Text>
            <TextInput
              style={[styles.input, { borderColor: DANGER }]}
              value={deleteWord}
              onChangeText={setDeleteWord}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <TouchableOpacity
              style={[styles.dangerButton, deleteWord.trim().toUpperCase() !== DELETE_WORD && styles.buttonDisabled]}
              onPress={confirmDelete}
              disabled={busy || deleteWord.trim().toUpperCase() !== DELETE_WORD}
              activeOpacity={0.7}
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Endgültig löschen</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.textButton} onPress={() => go('main')} disabled={busy}>
              <Text style={styles.textButtonText}>Abbrechen</Text>
            </TouchableOpacity>
            <Text style={styles.footnote}>Danach startet die App leer neu, mit einem frischen Konto.</Text>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingTop: 52, paddingBottom: 40, gap: 16 },
  back: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginLeft: -6, minHeight: 44, marginBottom: -12 },
  backText: { color: BLUE, fontSize: 16 },
  header: { fontSize: 22, fontWeight: '600' },
  lead: { fontSize: 14, color: '#555', lineHeight: 21, marginTop: -6 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: MUTED, marginBottom: -8 },
  card: { backgroundColor: CARD_BG, borderRadius: 12, padding: 16, gap: 14 },
  statusRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  statusIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  statusTitle: { fontSize: 15, fontWeight: '600' },
  statusEmail: { fontSize: 14, marginTop: 2 },
  body: { fontSize: 13, color: '#555', lineHeight: 19, marginTop: 4 },
  successBanner: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#e8f8ec', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
  successText: { fontSize: 14, fontWeight: '600', color: GREEN_TEXT, flex: 1 },
  primaryButton: { minHeight: 48, borderRadius: 10, backgroundColor: BLUE, justifyContent: 'center', alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  dangerButton: { minHeight: 48, borderRadius: 10, backgroundColor: DANGER, justifyContent: 'center', alignItems: 'center' },
  buttonDisabled: { opacity: 0.4 },
  outlineButton: { minHeight: 44, borderRadius: 10, borderWidth: 1.5, borderColor: '#d1d1d6', backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  outlineButtonText: { fontSize: 15 },
  rowLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, paddingHorizontal: 16, backgroundColor: CARD_BG, borderRadius: 12 },
  rowLinkText: { fontSize: 15 },
  version: { textAlign: 'center', fontSize: 12, color: MUTED, marginTop: 24 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: -10 },
  input: { minHeight: 48, borderWidth: 1.5, borderColor: BLUE, borderRadius: 10, paddingHorizontal: 14, fontSize: 16 },
  warning: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: '#fff4e5', borderRadius: 12, padding: 14 },
  warningText: { flex: 1, fontSize: 13, color: '#5c3a00', lineHeight: 19 },
  infoBox: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: CARD_BG, borderRadius: 12, padding: 14 },
  infoText: { flex: 1, fontSize: 13, color: '#444', lineHeight: 19 },
  error: { fontSize: 13, color: DANGER, lineHeight: 19 },
  codeRow: { flexDirection: 'row', gap: 8 },
  codeBox: { flex: 1, height: 54, borderRadius: 10, backgroundColor: CARD_BG, justifyContent: 'center', alignItems: 'center' },
  codeBoxActive: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: BLUE },
  codeDigit: { fontSize: 24, fontWeight: '600' },
  hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  textButton: { minHeight: 44, justifyContent: 'center', alignItems: 'center', marginTop: -8 },
  textButtonText: { fontSize: 14, color: BLUE },
  countRow: { flexDirection: 'row', justifyContent: 'space-between' },
  countLabel: { fontSize: 14 },
  countValue: { fontSize: 14, color: '#6b6b70' },
  footnote: { fontSize: 12, color: '#6b6b70', textAlign: 'center', lineHeight: 18, marginTop: 8 },
});
