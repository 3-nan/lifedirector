// lib/supabase.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import 'react-native-url-polyfill/auto';

const supabaseUrl = 'https://yawjnqaxwdwteruhebjm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlhd2pucWF4d2R3dGVydWhlYmptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyOTM3NDIsImV4cCI6MjEwMzg2OTc0Mn0.Qfho4rFUdmnFq1yxUxJGfxmHCtI2ZokkzI9luc05bsw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
// Token-Refresh nur, solange die App im Vordergrund ist (Empfehlung aus dem
// Expo-Supabase-Guide) — im Hintergrund laufen keine Timer zuverlässig.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

/** Wo supabase-js die Session ablegt (Default-Schlüssel der Bibliothek). */
const AUTH_STORAGE_KEY = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;

async function hasStoredSession(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(AUTH_STORAGE_KEY)) !== null;
  } catch {
    return false;
  }
}

/**
 * Sorgt dafür, dass immer ein Account existiert: beim allerersten Start wird
 * still ein anonymer Account angelegt (kein Login-Screen). Die Daten gehören
 * ab dann diesem Account und bleiben erhalten, wenn er später per E-Mail
 * gesichert wird (gleiche user_id). Siehe ROADMAP.md, "Accounts / Multi-User".
 *
 * Offline: Ist das Zugangs-Token abgelaufen (nach ~1 Std.), kann supabase-js
 * es ohne Netz nicht erneuern und liefert keine Session. Dann darf auf keinen
 * Fall ein neuer anonymer Account entstehen — der würde den bestehenden auf
 * diesem Gerät ersetzen. Liegt eine Session auf dem Gerät, startet die App
 * trotzdem ('offline'); sobald wieder Netz da ist, erneuert supabase-js das
 * Token von selbst. Nur ohne gespeicherte Session wird ein Account angelegt.
 */
export async function ensureSession(): Promise<'online' | 'offline'> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (session) return 'online';
  if (error || (await hasStoredSession())) return 'offline';
  const { data, error: signInError } = await supabase.auth.signInAnonymously();
  if (signInError || !data.session) throw signInError ?? new Error('Keine Session erhalten');
  return 'online';
}
