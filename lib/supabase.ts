// lib/supabase.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, Session } from '@supabase/supabase-js';
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

/**
 * Sorgt dafür, dass immer ein Account existiert: beim allerersten Start wird
 * still ein anonymer Account angelegt (kein Login-Screen). Die Daten gehören
 * ab dann diesem Account und bleiben erhalten, wenn er später per E-Mail
 * gesichert wird (gleiche user_id). Siehe ROADMAP.md, "Accounts / Multi-User".
 */
export async function ensureSession(): Promise<Session> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return session;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.session) throw error ?? new Error('Keine Session erhalten');
  return data.session;
}
