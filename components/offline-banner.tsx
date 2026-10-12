import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { isOffline, onOfflineChange } from '../lib/offline';
import { MUTED_TEXT } from '../constants/theme';

/** Schmaler Hinweis, solange die App ohne Netz den letzten Stand zeigt. */
export function OfflineBanner({ canCheckOff = false }: { canCheckOff?: boolean }) {
  const [offline, setOffline] = useState(isOffline());
  useEffect(() => onOfflineChange(setOffline), []);
  if (!offline) return null;
  return (
    <View style={styles.banner}>
      <Ionicons name="cloud-offline-outline" size={16} color={MUTED_TEXT} />
      <Text style={styles.text}>
        Offline — du siehst den letzten Stand.
        {canCheckOff ? ' Abhaken wird gemerkt und übertragen, sobald du wieder Netz hast.' : ' Änderungen gehen erst wieder mit Netz.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#f2f2f5', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 12 },
  text: { flex: 1, fontSize: 12.5, color: MUTED_TEXT, lineHeight: 17 },
});
