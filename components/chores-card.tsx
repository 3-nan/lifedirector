import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ACCENT, MUTED, MUTED_TEXT, ORANGE_TEXT, SKY } from '../constants/theme';
import { choreMeta, grouped, openChores, todayList } from '../lib/chores';
import { todayStr } from '../lib/period';
import { Chore } from '../types/chore';

/** Eine Aufgabe als Zeile: Haken, Titel + Hinweiszeile, rechts eine Aktion. */
export function ChoreRow({ chore, all, onToggle, action, onLongPress }: {
  chore: Chore;
  all: Chore[];
  onToggle: () => void;
  action?: { label: string; onPress: () => void; tone?: 'sky' };
  onLongPress?: () => void;
}) {
  const done = chore.status === 'done';
  const meta = done ? { text: null, warn: false } : choreMeta(chore, all, todayStr());
  return (
    <TouchableOpacity style={styles.row} onPress={onToggle} onLongPress={onLongPress} activeOpacity={0.7}>
      <View
        style={[styles.check, done && styles.checkDone]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={chore.title}
      >
        {done && <Ionicons name="checkmark" size={14} color="#fff" />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, done && styles.titleDone]}>{chore.title}</Text>
        {meta.text && <Text style={[styles.meta, meta.warn && { color: ORANGE_TEXT }]}>{meta.text}</Text>}
      </View>
      {action && !done && (
        <TouchableOpacity
          style={[styles.action, action.tone === 'sky' && styles.actionSky]}
          onPress={action.onPress}
          accessibilityLabel={`${action.label}: ${chore.title}`}
          activeOpacity={0.7}
        >
          <Text style={[styles.actionText, action.tone === 'sky' && styles.actionTextSky]}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

/** Oben auf `Today`: fällige Aufgaben, Aufgaben der Woche zum Aufklappen. */
export function ChoresCard({ chores, onToggle, onPostpone, onToToday, onAdd, onOpenAll }: {
  chores: Chore[];
  onToggle: (c: Chore) => void;
  onPostpone: (c: Chore) => void;
  onToToday: (c: Chore) => void;
  onAdd: () => void;
  onOpenAll: () => void;
}) {
  const [weekOpen, setWeekOpen] = useState(false);
  const today = todayStr();
  const { open, doneToday } = todayList(chores, today);
  const week = grouped(chores, today).week;
  const total = openChores(chores).length;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.label}>ERLEDIGEN · HEUTE</Text>
        {total > 0 && (
          <TouchableOpacity onPress={onOpenAll} style={styles.headLink} accessibilityLabel="Alle Aufgaben">
            <Text style={styles.link}>Alle {total} ›</Text>
          </TouchableOpacity>
        )}
      </View>

      {open.map((c) => (
        <ChoreRow key={c.id} chore={c} all={chores} onToggle={() => onToggle(c)} action={{ label: 'Später', onPress: () => onPostpone(c) }} />
      ))}
      {doneToday.map((c) => <ChoreRow key={c.id} chore={c} all={chores} onToggle={() => onToggle(c)} />)}
      {open.length === 0 && doneToday.length === 0 && <Text style={styles.empty}>Heute steht nichts an.</Text>}

      {weekOpen && week.length > 0 && (
        <>
          <Text style={[styles.label, { marginTop: 6 }]}>DIESE WOCHE</Text>
          {week.map((c) => (
            <ChoreRow key={c.id} chore={c} all={chores} onToggle={() => onToggle(c)} action={{ label: 'Heute', onPress: () => onToToday(c), tone: 'sky' }} />
          ))}
        </>
      )}

      <View style={styles.foot}>
        <TouchableOpacity style={styles.add} onPress={onAdd} activeOpacity={0.7}>
          <Ionicons name="add" size={18} color={SKY.text} />
          <Text style={styles.addText}>Aufgabe notieren</Text>
        </TouchableOpacity>
        {week.length > 0 && (
          <TouchableOpacity
            style={styles.weekToggle}
            onPress={() => setWeekOpen((v) => !v)}
            accessibilityState={{ expanded: weekOpen }}
          >
            <Text style={styles.weekToggleText}>{weekOpen ? 'Woche einklappen' : `+ ${week.length} diese Woche`}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: SKY.bg, borderRadius: 16, padding: 14, paddingBottom: 6, gap: 6, marginBottom: 16 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headLink: { minHeight: 32, justifyContent: 'center' },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, color: SKY.text },
  link: { fontSize: 13, fontWeight: '600', color: SKY.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 10, paddingLeft: 12, paddingRight: 10, minHeight: 48 },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: SKY.ring, justifyContent: 'center', alignItems: 'center' },
  checkDone: { backgroundColor: ACCENT, borderColor: ACCENT },
  title: { fontSize: 15 },
  titleDone: { color: MUTED, textDecorationLine: 'line-through' },
  meta: { fontSize: 12, color: MUTED_TEXT, marginTop: 2 },
  action: { minHeight: 36, paddingHorizontal: 10, borderRadius: 10, backgroundColor: SKY.soft, justifyContent: 'center' },
  actionSky: { backgroundColor: SKY.bg },
  actionText: { fontSize: 12, color: '#4a4a4f' },
  actionTextSky: { color: SKY.text, fontWeight: '600' },
  empty: { fontSize: 14, color: MUTED_TEXT, paddingVertical: 4 },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  add: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  addText: { fontSize: 14, fontWeight: '600', color: SKY.text },
  weekToggle: { minHeight: 44, justifyContent: 'center' },
  weekToggleText: { fontSize: 12.5, color: '#4a4a4f' },
});
