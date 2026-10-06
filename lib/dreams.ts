// lib/dreams.ts
// Träume / Lebensziele — siehe ROADMAP.md. Grundsatz: Traum lebendig halten,
// Hindernis benennen, immer genau einen kleinen nächsten Schritt haben.
import { Dream, DreamHorizon, DreamStage } from '../types/dream';
import { isoWeekKey } from './period';
import { supabase } from './supabase';
import { refreshDreamWidgets } from './widget-bridge';

export const HORIZON_ORDER: DreamHorizon[] = ['this_year', '1_3_years', '5_plus', 'someday'];

export const HORIZON_LABEL: Record<DreamHorizon, string> = {
  this_year: 'Dieses Jahr',
  '1_3_years': 'In 1–3 Jahren',
  '5_plus': 'In 5+ Jahren',
  someday: 'Irgendwann',
};

/** Die Reise eines Traums; `let_go` steht bewusst außerhalb — Loslassen ist ein Abschluss, kein Rückschritt. */
export const STAGE_ORDER: DreamStage[] = ['dream', 'explored', 'planned', 'committed', 'fulfilled'];

export const STAGE_LABEL: Record<DreamStage, string> = {
  dream: 'Traum',
  explored: 'Erkundet',
  planned: 'Geplant',
  committed: 'Fest zugesagt',
  fulfilled: 'Erfüllt',
  let_go: 'Losgelassen',
};

/** Worum es in der aktuellen Stufe geht — Grundlage für Schritt-Ideen in der UI. */
export const STAGE_HINT: Record<DreamStage, string> = {
  dream: 'Erkunden: recherchieren oder mit jemandem reden, der es schon gemacht hat.',
  explored: 'Planen: Budget, Zeitraum, was du brauchst.',
  planned: 'Fest zusagen: buchen, anmelden, anzahlen — ab dann passiert es.',
  committed: 'Machen. Du hast es dir fest vorgenommen.',
  fulfilled: 'Geschafft. Wie war es?',
  let_go: 'Bewusst losgelassen — völlig in Ordnung.',
};

/** Kartenfarben (Hintergrund hell, Akzent kräftig) — Name wird in `dreams.color` gespeichert. */
export const DREAM_COLORS: Record<string, { bg: string; accent: string }> = {
  blue: { bg: '#eaf2ff', accent: '#007aff' },
  green: { bg: '#e8f8ec', accent: '#248a3d' },
  orange: { bg: '#fff0e0', accent: '#b25900' },
  purple: { bg: '#f3eafd', accent: '#8944ab' },
  pink: { bg: '#fdeaf1', accent: '#c2185b' },
  teal: { bg: '#e3f6f5', accent: '#00857a' },
};

export function dreamColor(name: string) {
  return DREAM_COLORS[name] ?? DREAM_COLORS.blue;
}

export function isOpen(dream: Dream): boolean {
  return dream.stage !== 'fulfilled' && dream.stage !== 'let_go';
}

export function nextStage(stage: DreamStage): DreamStage | null {
  const i = STAGE_ORDER.indexOf(stage);
  return i >= 0 && i < STAGE_ORDER.length - 1 ? STAGE_ORDER[i + 1] : null;
}

/**
 * "Traum der Woche": deterministisch pro ISO-Woche (bleibt also die ganze
 * Woche derselbe). Bevorzugt nahe Horizonte und Träume, an denen am längsten
 * nichts passiert ist — ersetzt eine harte Begrenzung der Anzahl Träume.
 */
export function pickDreamOfWeek(dreams: Dream[], weekKey: string = isoWeekKey()): Dream | null {
  const open = dreams.filter(isOpen);
  if (open.length === 0) return null;
  const horizonWeight: Record<DreamHorizon, number> = { this_year: 3, '1_3_years': 2, '5_plus': 1, someday: 1 };
  const scored = open
    .map((d) => {
      const idleDays = (Date.now() - new Date(d.last_activity_at).getTime()) / (24 * 3600 * 1000);
      return { d, score: horizonWeight[d.horizon] * (1 + Math.min(idleDays, 90) / 30) };
    })
    .sort((a, b) => b.score - a.score);
  // Unter den drei Top-Kandidaten pro Woche rotieren, damit nicht immer derselbe dran ist.
  const top = scored.slice(0, 3);
  let hash = 0;
  for (let i = 0; i < weekKey.length; i++) hash = (hash * 31 + weekKey.charCodeAt(i)) >>> 0;
  return top[hash % top.length].d;
}

async function touch(dreamId: string, patch: Partial<Dream> = {}) {
  const now = new Date().toISOString();
  const result = await supabase.from('dreams').update({ ...patch, last_activity_at: now, updated_at: now }).eq('id', dreamId);
  refreshDreamWidgets();
  return result;
}

export async function updateDream(dreamId: string, patch: Partial<Dream>) {
  return touch(dreamId, patch);
}

export async function setStage(dream: Dream, stage: DreamStage, fulfilledNote?: string) {
  return touch(dream.id, {
    stage,
    fulfilled_at: stage === 'fulfilled' ? new Date().toISOString() : null,
    fulfilled_note: stage === 'fulfilled' ? fulfilledNote ?? dream.fulfilled_note : dream.fulfilled_note,
  });
}

/** Nächsten Schritt direkt als erledigt verbuchen (ohne Umweg über einen Wochen-Task). */
export async function completeNextStep(dream: Dream) {
  if (!dream.next_step) return;
  const { error } = await supabase
    .from('dream_steps')
    .insert({ dream_id: dream.id, title: dream.next_step, done_at: new Date().toISOString() });
  if (error) return { error };
  return touch(dream.id, { next_step: null });
}

/**
 * Nächsten Schritt als Wochen-Task übernehmen: landet in `Today` unter
 * "Diese Woche". Abhaken dort markiert den Schritt per DB-Trigger als erledigt.
 */
export async function nextStepToWeeklyTask(dream: Dream) {
  if (!dream.next_step) return;
  const { data: task, error } = await supabase
    .from('tasks')
    .insert({ title: dream.next_step, category: null, dream_id: dream.id, week_key: isoWeekKey() })
    .select('id')
    .single();
  if (error || !task) return { error };
  const { error: stepError } = await supabase
    .from('dream_steps')
    .insert({ dream_id: dream.id, title: dream.next_step, task_id: task.id });
  if (stepError) return { error: stepError };
  return touch(dream.id, { next_step: null });
}

/** Auswahl beim Anlegen/Bearbeiten — bewusst kuratiert statt kompletter Emoji-Tastatur. */
export const DREAM_EMOJIS = [
  '✨', '✈️', '🌴', '🏔️', '🌊', '🏄', '🌌', '🏃', '🚴', '🧗', '⛵', '🏕️',
  '🎸', '🎹', '🎨', '📚', '🍳', '🪚', '🏡', '🐶', '🌍', '🗣️', '🎤', '❤️',
];

/** Stufe, die als Nächstes gefeiert wird — `null`, wenn es kein "Weiter" gibt. */
export type CelebratedStage = 'explored' | 'planned' | 'committed' | 'fulfilled';

/**
 * "Traum des Tages" fürs Widget: rotiert täglich reihum durch alle offenen
 * Träume (stabile Reihenfolge nach Anlage), damit alle präsent bleiben. Jeden
 * dritten Tag kommt stattdessen der Traum, der gerade am meisten Aufmerksamkeit
 * braucht (gleiche Gewichtung wie der "Traum der Woche") — so erscheinen
 * vernachlässigte und nahe Träume etwas öfter. Bewusst getrennt vom
 * wöchentlichen Fokus auf `Today`.
 */
export function pickDreamOfDay(dreams: Dream[], date: Date = new Date()): Dream | null {
  const open = dreams.filter(isOpen).sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (open.length === 0) return null;
  const dayIndex = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / (24 * 3600 * 1000));
  if (open.length > 2 && dayIndex % 3 === 0) {
    const horizonWeight: Record<DreamHorizon, number> = { this_year: 3, '1_3_years': 2, '5_plus': 1, someday: 1 };
    const neediest = [...open].sort((a, b) => {
      const score = (d: Dream) =>
        horizonWeight[d.horizon] * (1 + Math.min((Date.now() - new Date(d.last_activity_at).getTime()) / (24 * 3600 * 1000), 90) / 30);
      return score(b) - score(a);
    });
    return neediest[0];
  }
  return open[dayIndex % open.length];
}

/**
 * Offene Traum-Schritte dieser Woche (als Wochen-Task übernommen, noch nicht
 * abgehakt), je Traum. Wichtig: beim Übernehmen wird `next_step` geleert —
 * ohne diese Abfrage sähe ein Traum mit laufendem Schritt aus, als fehle er.
 */
export async function loadStepsThisWeek(): Promise<Record<string, string>> {
  const { data } = await supabase
    .from('tasks')
    .select('dream_id, title')
    .not('dream_id', 'is', null)
    .eq('week_key', isoWeekKey())
    .eq('done', false);
  const byDream: Record<string, string> = {};
  (data ?? []).forEach((t) => {
    if (t.dream_id) byDream[t.dream_id] = t.title;
  });
  return byDream;
}

/** Der aktuell relevante Schritt eines Traums: festgelegt oder diese Woche in Arbeit. */
export function currentStep(
  dream: Dream,
  stepsThisWeek: Record<string, string>
): { title: string; thisWeek: boolean } | null {
  if (dream.next_step) return { title: dream.next_step, thisWeek: false };
  const weekStep = stepsThisWeek[dream.id];
  return weekStep ? { title: weekStep, thisWeek: true } : null;
}
