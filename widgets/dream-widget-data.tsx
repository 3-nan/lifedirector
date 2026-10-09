import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestWidgetUpdate, WidgetInfo, WidgetTaskHandler } from 'react-native-android-widget';
import { currentStep, isOpen, loadStepsThisWeek, pickDreamOfDay } from '../lib/dreams';
import { supabase } from '../lib/supabase';
import { Dream } from '../types/dream';
import { DreamWidget, DreamWidgetMode, DreamWidgetState, ErrorWidget, WIDGET_VARIANTS } from './DreamWidget';
import { getWidgetImage, pruneWidgetImages } from './widget-images';

// Läuft auch ohne geöffnete App (Headless-Task im Hintergrund). Legt deshalb
// nie selbst einen Account an — ohne gespeicherte Session zeigt das Widget
// nur einen Hinweis, die App einmal zu öffnen.

/** Alle Traum-Widget-Vorlagen (müssen zu den `name`s in app.json passen). */
export const DREAM_WIDGET_NAMES = Object.keys(WIDGET_VARIANTS);

export type DreamWidgetConfig = { mode: DreamWidgetMode; dreamId?: string };

const configKey = (widgetId: number) => `dreamWidget:${widgetId}`;

export async function getWidgetConfig(widgetId: number): Promise<DreamWidgetConfig> {
  try {
    const raw = await AsyncStorage.getItem(configKey(widgetId));
    if (raw) return JSON.parse(raw) as DreamWidgetConfig;
  } catch {
    // kaputte/fehlende Konfiguration → Standard
  }
  return { mode: 'rotate' };
}

export async function saveWidgetConfig(widgetId: number, config: DreamWidgetConfig) {
  await AsyncStorage.setItem(configKey(widgetId), JSON.stringify(config));
}

async function removeWidgetConfig(widgetId: number) {
  await AsyncStorage.removeItem(configKey(widgetId)).catch(() => {});
}

export type WidgetData = { dreams: Dream[]; stepsThisWeek: Record<string, string> };

/** `null` = keine Session auf diesem Gerät. */
export async function loadDreams(): Promise<WidgetData | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const [{ data, error }, stepsThisWeek] = await Promise.all([supabase.from('dreams').select('*'), loadStepsThisWeek()]);
  // Fotos gelöschter Träume vom Gerät entfernen — nur bei vollständiger Liste,
  // sonst würde ein Netzwerkfehler alle Kopien löschen.
  if (!error && data) await pruneWidgetImages(data.map((d) => d.id));
  return { dreams: data ?? [], stepsThisWeek };
}

export function resolveDream(
  data: WidgetData | null,
  config: DreamWidgetConfig
): { dream: Dream | null; step: string | null; state: DreamWidgetState } {
  if (data === null) return { dream: null, step: null, state: 'signed-out' };
  const withStep = (dream: Dream) => ({ dream, step: currentStep(dream, data.stepsThisWeek)?.title ?? null, state: 'ok' as const });
  if (config.mode === 'fixed' && config.dreamId) {
    const dream = data.dreams.find((d) => d.id === config.dreamId);
    return dream && isOpen(dream) ? withStep(dream) : { dream: null, step: null, state: 'missing' };
  }
  const dream = pickDreamOfDay(data.dreams);
  return dream ? withStep(dream) : { dream: null, step: null, state: 'no-dreams' };
}

async function buildWidget(info: WidgetInfo, data?: WidgetData | null) {
  try {
    const config = await getWidgetConfig(info.widgetId);
    const { dream, step, state } = resolveDream(data === undefined ? await loadDreams() : data, config);
    const image = await getWidgetImage(dream);
    return (
      <DreamWidget
        dream={dream}
        step={step}
        image={image}
        mode={config.mode}
        state={state}
        width={info.width}
        height={info.height}
        variant={WIDGET_VARIANTS[info.widgetName] ?? 'standard'}
      />
    );
  } catch (e) {
    return <ErrorWidget message={e instanceof Error ? e.message : String(e)} />;
  }
}

export const dreamWidgetTaskHandler: WidgetTaskHandler = async ({ widgetInfo, widgetAction, renderWidget }) => {
  if (widgetAction === 'WIDGET_DELETED') {
    await removeWidgetConfig(widgetInfo.widgetId);
    return;
  }
  // Tippen öffnet die App direkt (OPEN_URI) — kein eigener Klick-Code nötig.
  if (widgetAction === 'WIDGET_CLICK') return;
  renderWidget(await buildWidget(widgetInfo));
};

/** Von der App aus: alle platzierten Traum-Widgets mit aktuellen Daten neu zeichnen. */
export async function refreshDreamWidgetsNow() {
  const data = await loadDreams();
  await Promise.all(
    DREAM_WIDGET_NAMES.map((widgetName) =>
      requestWidgetUpdate({ widgetName, renderWidget: (info) => buildWidget(info, data) })
    )
  );
}
