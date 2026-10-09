import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dream } from '../types/dream';

// Lokale Kopie der Traum-Fotos für die Widgets. Ohne sie lädt die Widget-
// Bibliothek das Foto bei jedem Neuzeichnen (~alle 30 Min.) erneut von
// Unsplash. So wird jedes Foto einmal geladen, als data:-URI gespeichert und
// erst bei einem anderen Foto neu geholt — und das Widget zeigt es auch offline.

const PREFIX = 'dreamWidgetImage:';
/** Breite der Widget-Kopie in px — reicht für das größte Widget, spart Speicher. */
const WIDGET_IMAGE_WIDTH = 600;

type CachedImage = { url: string; data: string };
export type WidgetImage = `data:image${string}`;

/** Unsplash-URL in Widget-Größe (Unsplash skaliert über die Parameter w/q). */
function widgetUrl(imageUrl: string): string {
  const set = (url: string, key: string, value: string) => {
    const re = new RegExp(`([?&])${key}=[^&]*`);
    if (re.test(url)) return url.replace(re, `$1${key}=${value}`);
    return `${url}${url.includes('?') ? '&' : '?'}${key}=${value}`;
  };
  return set(set(imageUrl, 'w', String(WIDGET_IMAGE_WIDTH)), 'q', '70');
}

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function readCache(dreamId: string): Promise<CachedImage | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + dreamId);
    return raw ? (JSON.parse(raw) as CachedImage) : null;
  } catch {
    return null;
  }
}

// Mehrere Widgets mit demselben Traum werden gleichzeitig gezeichnet — nur einmal laden.
const inFlight = new Map<string, Promise<WidgetImage | null>>();

async function download(dreamId: string, url: string, stale: CachedImage | null): Promise<WidgetImage | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`image ${res.status}`);
    const data = await blobToDataUri(await res.blob());
    if (!data.startsWith('data:image')) throw new Error('not an image');
    await AsyncStorage.setItem(PREFIX + dreamId, JSON.stringify({ url, data }));
    return data as WidgetImage;
  } catch {
    // Offline o.ä.: lieber das alte Foto als gar keins.
    return (stale?.data as WidgetImage | undefined) ?? null;
  }
}

/** Foto des Traums für das Widget (lokale Kopie), oder null ohne Foto. */
export async function getWidgetImage(dream: Dream | null): Promise<WidgetImage | null> {
  if (!dream?.image_url) return null;
  const url = widgetUrl(dream.image_url);
  const cached = await readCache(dream.id);
  if (cached?.url === url) return cached.data as WidgetImage;

  const key = `${dream.id}|${url}`;
  let pending = inFlight.get(key);
  if (!pending) {
    pending = download(dream.id, url, cached).finally(() => inFlight.delete(key));
    inFlight.set(key, pending);
  }
  return pending;
}

/** Löscht die Kopien aller Träume, die es nicht mehr gibt. */
export async function pruneWidgetImages(existingDreamIds: string[]) {
  try {
    const keep = new Set(existingDreamIds.map((id) => PREFIX + id));
    const stale = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX) && !keep.has(k));
    if (stale.length > 0) await AsyncStorage.multiRemove(stale);
  } catch {
    // Aufräumen ist nicht kritisch — beim nächsten Mal wieder.
  }
}
