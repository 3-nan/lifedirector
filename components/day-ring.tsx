import { StyleSheet, Text, View } from 'react-native';
import { ACCENT, TEXT } from '../constants/theme';

const TRACK = '#e5e5ea';

/**
 * Fortschrittsring ohne SVG (react-native-svg wäre ein neues natives Modul →
 * neuer Build). Zwei Halbkreis-Ausschnitte, in denen je ein halber Ring
 * passend gedreht wird.
 */
export function DayRing({ done, total, size = 64, width = 7 }: { done: number; total: number; size?: number; width?: number }) {
  const angle = total > 0 ? Math.min(done / total, 1) * 360 : 0;
  const half = size / 2;

  // Ein Kreis, bei dem nur unten + links gefärbt ist, deckt 135°–315° ab
  // (0° = oben, im Uhrzeigersinn). Um `a - 315` gedreht endet der Bogen bei `a`.
  const arc = (a: number) => (
    <View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: half,
        borderWidth: width,
        borderColor: 'transparent',
        borderBottomColor: ACCENT,
        borderLeftColor: ACCENT,
        transform: [{ rotate: `${a - 315}deg` }],
      }}
    />
  );

  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityLabel={`${done} von ${total} Gewohnheiten erledigt`}
    >
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: half, borderWidth: width, borderColor: TRACK }} />
      {angle > 0 && (
        <View style={{ position: 'absolute', left: half, width: half, height: size, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', left: -half, width: size, height: size }}>{arc(Math.min(angle, 180))}</View>
        </View>
      )}
      {angle > 180 && (
        <View style={{ position: 'absolute', left: 0, width: half, height: size, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', left: 0, width: size, height: size }}>{arc(angle)}</View>
        </View>
      )}
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={styles.label}>{done}/{total}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 16, fontWeight: '700', color: TEXT },
});
