// Eigener Einstiegspunkt statt direkt 'expo-router/entry': die Home-Screen-
// Widgets brauchen einen Hintergrund-Task und einen Einrichtungs-Screen, die
// beim App-Start registriert werden müssen — aber nur, wo das native Modul
// existiert (nicht in Expo Go, nicht auf iOS).
import 'expo-router/entry';
import { widgetsAvailable } from './lib/widget-bridge';

if (widgetsAvailable) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- bewusst nachgeladen, siehe oben
  require('./widgets/register');
}
