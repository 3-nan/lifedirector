import Constants, { ExecutionEnvironment } from 'expo-constants';
import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, ScrollViewProps } from 'react-native';

// Seit SDK 54 laufen Android-Apps edge-to-edge — dann schiebt das System den
// Inhalt bei geöffneter Tastatur nicht mehr hoch, Eingabefelder unten werden
// verdeckt. `react-native-keyboard-controller` scrollt das fokussierte Feld
// automatisch über die Tastatur (Expo-Empfehlung). Das native Modul fehlt aber
// in Expo Go — dort deshalb gar nicht erst laden und auf
// KeyboardAvoidingView + ScrollView zurückfallen (verdeckt nichts, scrollt
// nur nicht automatisch zum Feld).
type KeyboardControllerModule = typeof import('react-native-keyboard-controller');

let controller: KeyboardControllerModule | null = null;
if (Constants.executionEnvironment !== ExecutionEnvironment.StoreClient) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- bewusst bedingt geladen, siehe oben
    controller = require('react-native-keyboard-controller');
  } catch {
    controller = null;
  }
}

/** Einmal um die ganze App (in `app/_layout.tsx`). */
export function KeyboardAwareProvider({ children }: { children: ReactNode }) {
  if (!controller) return <>{children}</>;
  const { KeyboardProvider } = controller;
  return <KeyboardProvider>{children}</KeyboardProvider>;
}

/**
 * Ersatz für `ScrollView` auf Screens mit Eingabefeldern: hält das fokussierte
 * Feld über der Tastatur (`bottomOffset` = Abstand zwischen Feld und Tastatur).
 */
export function KeyboardAwareScroll({ bottomOffset = 24, children, ...props }: ScrollViewProps & { bottomOffset?: number }) {
  if (controller) {
    const { KeyboardAwareScrollView } = controller;
    return (
      <KeyboardAwareScrollView bottomOffset={bottomOffset} keyboardShouldPersistTaps="handled" {...props}>
        {children}
      </KeyboardAwareScrollView>
    );
  }
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" {...props}>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
