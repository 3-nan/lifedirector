import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import 'react-native-reanimated';
import { KeyboardAwareProvider } from '../components/keyboard-aware';
import { fetchMissingDreamImages } from '../lib/dream-image';
import { listenToNotificationActions } from '../lib/notifications';
import { syncPending } from '../lib/offline';
import { ensureSession } from '../lib/supabase';
import { refreshDreamWidgets } from '../lib/widget-bridge';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(() => {
    ensureSession()
      .then(() => {
        setReady(true);
        // Widgets beim App-Start auffrischen (z.B. nach Änderungen auf einem anderen Gerät).
        refreshDreamWidgets();
        // Offline Abgehaktes übertragen.
        syncPending().catch(() => {});
        // Fotos für Träume nachholen, bei denen noch nie gesucht wurde.
        fetchMissingDreamImages();
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(() => { connect(); }, [connect]);

  // Knöpfe in Aufgaben-Erinnerungen (Erledigt / In 1 Std. / Morgen) — erst mit Session.
  useEffect(() => (ready ? listenToNotificationActions() : undefined), [ready]);

  function retry() {
    setError(null);
    connect();
  }

  // Alle Screens laden ihre Daten direkt beim Mount — ohne Session würden die
  // Abfragen an den Row-Level-Security-Regeln scheitern und leer bleiben.
  // Fehler gibt es hier nur beim allerersten Start ohne Netz (siehe ensureSession).
  if (!ready) {
    return (
      <View style={styles.center}>
        {error ? (
          <>
            <Text style={styles.errorTitle}>Keine Verbindung</Text>
            <Text style={styles.errorText}>
              Für den allerersten Start braucht LifeDirector einmal Internet, um deinen Account anzulegen. Danach startet die App auch offline.
            </Text>
            <Text style={styles.errorDetail}>{error}</Text>
            <TouchableOpacity style={styles.retry} onPress={retry} activeOpacity={0.7}>
              <Text style={styles.retryText}>Nochmal versuchen</Text>
            </TouchableOpacity>
          </>
        ) : (
          <ActivityIndicator />
        )}
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <KeyboardAwareProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="chores" options={{ headerShown: false }} />
        <Stack.Screen name="chores-review" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="dream/new" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="dream/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="dream/memories" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </KeyboardAwareProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fff' },
  errorTitle: { fontSize: 17, fontWeight: '600', marginBottom: 8 },
  errorText: { fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 19, marginBottom: 8 },
  errorDetail: { fontSize: 11, color: '#999', textAlign: 'center', marginBottom: 20 },
  retry: { backgroundColor: '#34c759', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 12 },
  retryText: { color: '#fff', fontWeight: '600' },
});
