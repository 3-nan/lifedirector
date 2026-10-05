import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

export type CelebrationPayload = {
  key: number; // eindeutig pro Auslösung, auch wenn derselbe Milestone/Text nochmal kommt
  emoji: string;
  title: string;
  line: string;
  durationMs?: number; // Standard 2400 — längere Texte (z.B. Challenge) brauchen mehr Lesezeit
};

const PARTICLE_COLORS = ['#34c759', '#007aff', '#ff9500', '#ff3b30', '#af52de', '#00c7be'];
const PARTICLE_COUNT = 16;

type ParticleSpec = { angle: number; distance: number; color: string; delay: number };

function makeParticles(): ParticleSpec[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    angle: (i / PARTICLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.4,
    distance: 90 + Math.random() * 70,
    color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
    delay: Math.random() * 80,
  }));
}

/** Ein frischer Satz Partikel pro Celebration — über `key={payload.key}` am
 * Mount erzeugt (lazy useState-Initializer), statt per setState im Effekt. */
function Burst() {
  const [particles] = useState<ParticleSpec[]>(() => makeParticles());
  return (
    <>
      {particles.map((p, i) => (
        <Particle key={i} {...p} />
      ))}
    </>
  );
}

function Particle({ angle, distance, color, delay }: { angle: number; distance: number; color: string; delay: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(delay, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [delay, progress]);

  const style = useAnimatedStyle(() => {
    const dx = Math.cos(angle) * distance * progress.value;
    const dy = Math.sin(angle) * distance * progress.value - 40 * progress.value * progress.value; // leichter Bogen nach oben
    return {
      opacity: 1 - progress.value,
      transform: [
        { translateX: dx },
        { translateY: dy },
        { rotate: `${angle * 2 + progress.value * 180}rad` },
      ],
    };
  });

  return <Animated.View style={[styles.particle, { backgroundColor: color }, style]} />;
}

export function CelebrationOverlay({
  payload,
  onDismiss,
}: {
  payload: CelebrationPayload | null;
  onDismiss: () => void;
}) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.85);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!payload) return;
    opacity.value = withTiming(1, { duration: 180 });
    scale.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.back(1.4)) });
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(onDismiss, payload.durationMs ?? 2400);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload?.key]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: opacity.value * 0.35 }));

  if (!payload) return null;

  return (
    <TouchableWithoutFeedback onPress={onDismiss}>
      <View style={styles.fill} pointerEvents="box-none">
        <Animated.View style={[styles.backdrop, backdropStyle]} />
        <View style={styles.center} pointerEvents="none">
          <Burst key={payload.key} />
          <Animated.View style={[styles.card, cardStyle]}>
            <Text style={styles.emoji}>{payload.emoji}</Text>
            <Text style={styles.title}>{payload.title}</Text>
            <Text style={styles.line}>{payload.line}</Text>
          </Animated.View>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  particle: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 28,
    alignItems: 'center',
    maxWidth: 280,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  emoji: { fontSize: 40, marginBottom: 8 },
  title: { fontSize: 17, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  line: { fontSize: 13, color: '#555', textAlign: 'center', lineHeight: 18 },
});
