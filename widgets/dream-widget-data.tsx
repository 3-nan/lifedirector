import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestWidgetUpdate, WidgetInfo, WidgetTaskHandler } from 'react-native-android-widget';
import { isOpen, pickDreamOfDay } from '../lib/dreams';
import { supabase } from '../lib/supabase';
import { Dream } from '../types/dream';
import { DreamWidget, DreamWidgetMode, DreamWidgetState } from './DreamWidget';

// Läuft auch ohne geöffnete App (Headless-Task im Hintergrund). Legt deshalb
// nie selbst einen Account an — ohne gespeicherte Session zeigt das Widget
// nur einen Hinweis, die App einmal zu öffnen.

export const DREAM_WIDGET_NAME = 'Dream';

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

/** `null` = keine Session auf diesem Gerät. */
export async function loadDreams(): Promise<Dream[] | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data } = await supabase.from('dreams').select('*');
  return data ?? [];
}

export function resolveDream(
  dreams: Dream[] | null,
  config: DreamWidgetConfig
): { dream: Dream | null; state: DreamWidgetState } {
  if (dreams === null) return { dream: null, state: 'signed-out' };
  if (config.mode === 'fixed' && config.dreamId) {
    const dream = dreams.find((d) => d.id === config.dreamId);
    return dream && isOpen(dream) ? { dream, state: 'ok' } : { dream: null, state: 'missing' };
  }
  const dream = pickDreamOfDay(dreams);
  return dream ? { dream, state: 'ok' } : { dream: null, state: 'no-dreams' };
}

async function buildWidget(info: WidgetInfo, dreams?: Dream[] | null) {
  const config = await getWidgetConfig(info.widgetId);
  const { dream, state } = resolveDream(dreams === undefined ? await loadDreams() : dreams, config);
  return <DreamWidget dream={dream} mode={config.mode} state={state} width={info.width} />;
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
  const dreams = await loadDreams();
  await requestWidgetUpdate({
    widgetName: DREAM_WIDGET_NAME,
    renderWidget: (info) => buildWidget(info, dreams),
  });
}
