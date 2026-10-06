import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import 'react-native-reanimated';
import { ensureSession } from '../lib/supabase';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(() => {
    ensureSession()
      .then(() => setReady(true))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(() => { connect(); }, [connect]);

  function retry() {
    setError(null);
    connect();
  }

  // Alle Screens laden ihre Daten direkt beim Mount — ohne Session würden die
  // Abfragen an den Row-Level-Security-Regeln scheitern und leer bleiben.
  if (!ready) {
    return (
      <View style={styles.center}>
        {error ? (
          <>
            <Text style={styles.errorTitle}>Verbindung fehlgeschlagen</Text>
            <Text style={styles.errorText}>{error}</Text>
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
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="dream/new" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="dream/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="dream/memories" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fff' },
  errorTitle: { fontSize: 17, fontWeight: '600', marginBottom: 8 },
  errorText: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 20 },
  retry: { backgroundColor: '#34c759', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 12 },
  retryText: { color: '#fff', fontWeight: '600' },
});
