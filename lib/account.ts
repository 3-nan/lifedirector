// lib/account.ts
// "Konto sichern" + "Daten löschen" — siehe ROADMAP.md, "Accounts / Multi-User".
// Jedes Gerät startet mit einem anonymen Account (`ensureSession`). Sichern
// hängt eine E-Mail an genau diesen Account (gleiche user_id, alle Daten
// bleiben); Anmelden holt auf einem anderen Gerät den gesicherten Account.
// Beides per 6-stelligem Code statt Link — dafür müssen die Supabase-Mail-
// Vorlagen "Magic Link" und "Change Email Address" {{ .Token }} enthalten.
import { Session } from '@supabase/supabase-js';
import { ensureSession, supabase } from './supabase';

export function isSecured(session: Session | null): boolean {
  return !!session && !session.user.is_anonymous && !!session.user.email;
}

/** Schritt 1 beim Sichern: Code an die neue E-Mail schicken. */
export async function requestSecureCode(email: string) {
  const { error } = await supabase.auth.updateUser({ email: email.trim() });
  if (error) throw error;
}

/** Schritt 2 beim Sichern: Code bestätigen — danach ist der Account nicht mehr anonym. */
export async function verifySecureCode(email: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: 'email_change' });
  if (error) throw error;
}

/** Anmelden auf einem weiteren Gerät: nur für schon gesicherte Accounts, legt keinen neuen an. */
export async function requestSignInCode(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: false },
  });
  if (error) throw error;
}

/**
 * Ersetzt die Session dieses Geräts durch den gesicherten Account. Der
 * bisherige anonyme Account bleibt verwaist zurück (Daten darin sind auf
 * diesem Gerät nicht mehr erreichbar) — deshalb warnt die UI vorher.
 */
export async function verifySignInCode(email: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: 'email' });
  if (error) throw error;
}

/** Anzahl aktiver Habits im aktuellen Account — für die Warnung vor dem Anmelden. */
export async function countOwnHabits(): Promise<number> {
  const { count } = await supabase.from('habits').select('id', { count: 'exact', head: true }).eq('active', true);
  return count ?? 0;
}

/** Abmelden: das Gerät startet danach mit einem frischen, leeren anonymen Account. */
export async function signOutToFreshAccount() {
  await supabase.auth.signOut({ scope: 'local' });
  await ensureSession();
}

/** Löscht den eigenen Account inkl. aller Daten und startet mit einem frischen Account neu. */
export async function deleteMyAccount() {
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw error;
  await signOutToFreshAccount();
}
