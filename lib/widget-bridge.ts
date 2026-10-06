// lib/widget-bridge.ts
// Einziger Zugang der App zu den Home-Screen-Widgets. Die Widget-Bibliothek
// lädt ihr natives Modul schon beim Import strikt — in Expo Go (und auf iOS)
// gibt es das nicht, ein normaler Import würde die App abstürzen lassen.
// Deshalb hier nur prüfen und den Widget-Code bei Bedarf nachladen.
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

export const widgetsAvailable =
  Platform.OS === 'android' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

/** Zeichnet alle Traum-Widgets neu — nach Änderungen an Träumen und beim App-Start. */
export function refreshDreamWidgets() {
  if (!widgetsAvailable) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- bewusst nachgeladen, siehe oben
    const { refreshDreamWidgetsNow } = require('../widgets/dream-widget-data');
    refreshDreamWidgetsNow().catch(() => {});
  } catch {
    // Widgets sind ein Extra — nie die App wegen eines Widget-Fehlers stören.
  }
}
