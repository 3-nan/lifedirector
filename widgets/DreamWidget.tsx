"use no memo";
// ^ Pflicht: Die Widget-Bibliothek ruft diese Komponenten als normale
// Funktionen auf (außerhalb von React). Der in app.json aktivierte React
// Compiler würde sie sonst mit Hooks umschreiben → "Invalid hook call" →
// "Error rendering widget" in der Vorschau und auf dem Startbildschirm.

import { FlexWidget, ImageWidget, OverlapWidget, TextWidget } from 'react-native-android-widget';
import { PHOTO_PANEL_ALPHA, withAlpha } from '../lib/dream-image';
import { dreamColor } from '../lib/dreams';
import { Dream } from '../types/dream';
import type { WidgetImage } from './widget-images';

// Nur über widgets/register.ts bzw. lib/widget-bridge.ts geladen (natives
// Modul, nicht in Expo Go). Layout siehe Mockup "Traum-Widgets".

export type DreamWidgetMode = 'rotate' | 'fixed';

/** Die Widget-Vorlagen im Widget-Picker (Namen = `name` in app.json). */
export type DreamWidgetVariant = 'standard' | 'small' | 'row' | 'mini';

export const WIDGET_VARIANTS: Record<string, DreamWidgetVariant> = {
  Dream: 'standard',
  DreamSmall: 'small',
  DreamRow: 'row',
  DreamMini: 'mini',
};
export type DreamWidgetState = 'ok' | 'no-dreams' | 'signed-out' | 'missing';

type Hex = `#${string}`;
type Rgba = `rgba(${number}, ${number}, ${number}, ${number})`;

const TEXT: Hex = '#1c1c1e';
const MUTED: Hex = '#555555';

/** Ab dieser Breite (dp) das breite Layout mit Kopfzeile und Schritt-Box. */
const MEDIUM_MIN_WIDTH = 220;

export function DreamWidget({
  dream,
  step,
  image = null,
  mode,
  state,
  width,
  height = 0,
  variant = 'standard',
}: {
  dream: Dream | null;
  /** Festgelegter nächster Schritt oder der Schritt, der diese Woche läuft. */
  step: string | null;
  /** Lokale Kopie des Traum-Fotos (widgets/widget-images.ts), null = ohne Foto. */
  image?: WidgetImage | null;
  mode: DreamWidgetMode;
  state: DreamWidgetState;
  width: number;
  height?: number;
  variant?: DreamWidgetVariant;
}) {
  if (state !== 'ok' || !dream) {
    return variant === 'mini' || variant === 'row' ? <EmptyMiniWidget /> : <EmptyWidget state={state} />;
  }
  if (image) {
    return <PhotoDreamWidget dream={dream} step={step} image={image} mode={mode} width={width} height={height} variant={variant} />;
  }

  const color = dreamColor(dream.color);
  const bg = color.bg as Hex;
  const accent = color.accent as Hex;
  const label = mode === 'rotate' ? 'TRAUM DES TAGES' : null;
  const uri = `lifedirector://dream/${dream.id}`;

  if (variant === 'mini') {
    return (
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri }}
        style={{ height: 'match_parent', width: 'match_parent', backgroundColor: bg, borderRadius: 18, justifyContent: 'center', alignItems: 'center' }}
      >
        <TextWidget text={dream.emoji} style={{ fontSize: 26 }} />
      </FlexWidget>
    );
  }

  if (variant === 'row') {
    return (
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri }}
        style={{ height: 'match_parent', width: 'match_parent', backgroundColor: bg, borderRadius: 18, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' }}
      >
        <TextWidget text={dream.emoji} style={{ fontSize: 22 }} />
        <FlexWidget style={{ flexDirection: 'column', marginLeft: 10, flex: 1 }}>
          <TextWidget text={dream.title} maxLines={1} truncate="END" style={{ fontSize: 13, fontWeight: '700', color: TEXT }} />
          <TextWidget
            text={step ? `Weiter: ${step}` : dream.feeling ? `„${dream.feeling}“` : 'Nächster Schritt? →'}
            maxLines={1}
            truncate="END"
            style={{ fontSize: 11, color: step ? MUTED : accent }}
          />
        </FlexWidget>
      </FlexWidget>
    );
  }

  if (variant === 'small' || width < MEDIUM_MIN_WIDTH) {
    return (
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri }}
        style={{ height: 'match_parent', width: 'match_parent', backgroundColor: bg, borderRadius: 22, padding: 12, flexDirection: 'column' }}
      >
        {label && <TextWidget text={label} style={{ fontSize: 9, fontWeight: '700', color: accent, letterSpacing: 0.05 }} />}
        <TextWidget text={dream.emoji} style={{ fontSize: 24, marginTop: 2 }} />
        <TextWidget text={dream.title} maxLines={1} truncate="END" style={{ fontSize: 13, fontWeight: '700', color: TEXT, marginTop: 2 }} />
        {dream.feeling && (
          <TextWidget
            text={`„${dream.feeling}“`}
            maxLines={2}
            truncate="END"
            style={{ fontSize: 11, fontStyle: 'italic', color: accent, marginTop: 2 }}
          />
        )}
        <FlexWidget style={{ flex: 1 }} />
        <TextWidget
          text={step ? `Weiter: ${step}` : 'Nächster Schritt? →'}
          maxLines={1}
          truncate="END"
          style={{ fontSize: 11, color: step ? MUTED : accent, fontWeight: step ? 'normal' : '700' }}
        />
      </FlexWidget>
    );
  }

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri }}
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: bg, borderRadius: 22, padding: 14, flexDirection: 'column' }}
    >
      {label && <TextWidget text={label} style={{ fontSize: 10, fontWeight: '700', color: accent, letterSpacing: 0.06 }} />}
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, width: 'match_parent' }}>
        <TextWidget text={dream.emoji} style={{ fontSize: 30 }} />
        <FlexWidget style={{ flexDirection: 'column', marginLeft: 10, flex: 1 }}>
          <TextWidget text={dream.title} maxLines={1} truncate="END" style={{ fontSize: 16, fontWeight: '700', color: TEXT }} />
          {dream.feeling && (
            <TextWidget
              text={`„${dream.feeling}“`}
              maxLines={2}
              truncate="END"
              style={{ fontSize: 12, fontStyle: 'italic', color: accent, marginTop: 2 }}
            />
          )}
        </FlexWidget>
      </FlexWidget>
      <FlexWidget style={{ flex: 1 }} />
      {step ? (
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7, width: 'match_parent' }}>
          <TextWidget text="WEITER" style={{ fontSize: 10, fontWeight: '700', color: accent }} />
          <TextWidget text={step} maxLines={1} truncate="END" style={{ fontSize: 13, color: TEXT, marginLeft: 8 }} />
        </FlexWidget>
      ) : (
        <FlexWidget style={{ borderRadius: 12, borderWidth: 1, borderColor: accent, borderStyle: 'dashed', paddingHorizontal: 10, paddingVertical: 7, width: 'match_parent' }}>
          <TextWidget text="Was ist dein nächster kleiner Schritt? →" maxLines={1} truncate="END" style={{ fontSize: 13, fontWeight: '700', color: accent }} />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}

/** Standardgrößen (dp), falls das System (z.B. in der Vorschau) keine liefert. */
const DEFAULT_SIZE: Record<DreamWidgetVariant, [number, number]> = {
  standard: [320, 154],
  small: [154, 154],
  row: [320, 64],
  mini: [72, 72],
};

/**
 * Traum mit Foto (Mockup "Widgets mit Foto"): Foto füllt das Widget, darüber
 * ein Text-Panel in der Traumfarbe mit 88 % Deckkraft — wie die Board-Karten.
 */
function PhotoDreamWidget({
  dream,
  step,
  image,
  mode,
  width,
  height,
  variant,
}: {
  dream: Dream;
  step: string | null;
  image: WidgetImage;
  mode: DreamWidgetMode;
  width: number;
  height: number;
  variant: DreamWidgetVariant;
}) {
  const color = dreamColor(dream.color);
  const accent = color.accent as Hex;
  const panel = withAlpha(color.bg, PHOTO_PANEL_ALPHA) as Rgba;
  const uri = `lifedirector://dream/${dream.id}`;
  const [w, h] = width > 0 && height > 0 ? [width, height] : DEFAULT_SIZE[variant];
  const radius = variant === 'mini' || variant === 'row' ? 18 : 22;
  const stepText = step ? `Weiter: ${step}` : 'Nächster Schritt? →';
  const stepStyle = { fontSize: 11, color: step ? MUTED : accent, fontWeight: step ? ('normal' as const) : ('700' as const) };

  let overlay;
  if (variant === 'mini') {
    overlay = (
      <FlexWidget style={{ height: 'match_parent', width: 'match_parent', flexDirection: 'column', padding: 5 }}>
        <FlexWidget style={{ flex: 1 }} />
        <FlexWidget style={{ flexDirection: 'row', width: 'match_parent' }}>
          <FlexWidget style={{ flex: 1 }} />
          <FlexWidget style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: panel, justifyContent: 'center', alignItems: 'center' }}>
            <TextWidget text={dream.emoji} style={{ fontSize: 14 }} />
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>
    );
  } else if (variant === 'row') {
    overlay = (
      <FlexWidget style={{ height: 'match_parent', width: 'match_parent', flexDirection: 'row', padding: 6 }}>
        <FlexWidget style={{ flex: 1, height: 'match_parent', borderRadius: 12, backgroundColor: panel, paddingHorizontal: 10, flexDirection: 'column', justifyContent: 'center' }}>
          <TextWidget text={`${dream.emoji} ${dream.title}`} maxLines={1} truncate="END" style={{ fontSize: 13, fontWeight: '700', color: TEXT }} />
          <TextWidget text={stepText} maxLines={1} truncate="END" style={stepStyle} />
        </FlexWidget>
        <FlexWidget style={{ width: 64 }} />
      </FlexWidget>
    );
  } else if (variant === 'small' || w < MEDIUM_MIN_WIDTH) {
    overlay = (
      <FlexWidget style={{ height: 'match_parent', width: 'match_parent', flexDirection: 'column', padding: 6 }}>
        <FlexWidget style={{ flex: 1 }} />
        <FlexWidget style={{ width: 'match_parent', borderRadius: 14, backgroundColor: panel, paddingHorizontal: 9, paddingVertical: 7, flexDirection: 'column' }}>
          <TextWidget text={`${dream.emoji} ${dream.title}`} maxLines={1} truncate="END" style={{ fontSize: 13, fontWeight: '700', color: TEXT }} />
          <TextWidget text={stepText} maxLines={1} truncate="END" style={stepStyle} />
        </FlexWidget>
      </FlexWidget>
    );
  } else {
    overlay = (
      <FlexWidget style={{ height: 'match_parent', width: 'match_parent', flexDirection: 'column', padding: 8 }}>
        {mode === 'rotate' && (
          <FlexWidget style={{ borderRadius: 8, backgroundColor: panel, paddingHorizontal: 7, paddingVertical: 3 }}>
            <TextWidget text="TRAUM DES TAGES" style={{ fontSize: 9.5, fontWeight: '700', color: accent, letterSpacing: 0.05 }} />
          </FlexWidget>
        )}
        <FlexWidget style={{ flex: 1 }} />
        <FlexWidget style={{ width: 'match_parent', borderRadius: 14, backgroundColor: panel, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'column' }}>
          <TextWidget text={`${dream.emoji} ${dream.title}`} maxLines={1} truncate="END" style={{ fontSize: 15, fontWeight: '700', color: TEXT }} />
          {dream.feeling && (
            <TextWidget text={`„${dream.feeling}“`} maxLines={1} truncate="END" style={{ fontSize: 12, fontStyle: 'italic', color: accent, marginTop: 2 }} />
          )}
          {step ? (
            <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, width: 'match_parent' }}>
              <TextWidget text="WEITER" style={{ fontSize: 10, fontWeight: '700', color: accent }} />
              <TextWidget text={step} maxLines={1} truncate="END" style={{ fontSize: 12.5, color: TEXT, marginLeft: 8 }} />
            </FlexWidget>
          ) : (
            <TextWidget text="Was ist dein nächster kleiner Schritt? →" maxLines={1} truncate="END" style={{ fontSize: 12.5, fontWeight: '700', color: accent, marginTop: 3 }} />
          )}
        </FlexWidget>
      </FlexWidget>
    );
  }

  return (
    <OverlapWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri }}
      style={{ height: 'match_parent', width: 'match_parent', borderRadius: radius, overflow: 'hidden' }}
    >
      <ImageWidget image={image} imageWidth={w} imageHeight={h} radius={radius} resizeMode="cover" style={{ height: 'match_parent', width: 'match_parent' }} />
      {overlay}
    </OverlapWidget>
  );
}

function EmptyMiniWidget() {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'lifedirector://dreams' }}
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: '#ffffff', borderRadius: 18, justifyContent: 'center', alignItems: 'center' }}
    >
      <TextWidget text="✨" style={{ fontSize: 24 }} />
    </FlexWidget>
  );
}

/** Diagnose: zeigt statt eines leeren/kaputten Widgets die Fehlermeldung. */
export function ErrorWidget({ message }: { message: string }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: '#ffffff', borderRadius: 18, padding: 10, flexDirection: 'column' }}
    >
      <TextWidget text="Widget-Fehler" style={{ fontSize: 11, fontWeight: '700', color: '#d70015' }} />
      <TextWidget text={message} maxLines={4} truncate="END" style={{ fontSize: 10, color: MUTED }} />
    </FlexWidget>
  );
}

function EmptyWidget({ state }: { state: DreamWidgetState }) {
  const text =
    state === 'signed-out'
      ? 'Öffne LifeDirector einmal, dann erscheinen hier deine Träume.'
      : state === 'missing'
        ? 'Dieser Traum ist erfüllt oder gelöscht. Halte das Widget gedrückt, um einen anderen zu wählen.'
        : 'Leg in LifeDirector deinen ersten Traum an — er erscheint dann hier.';
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'lifedirector://dreams' }}
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: '#ffffff', borderRadius: 22, padding: 14, flexDirection: 'column' }}
    >
      <TextWidget text="TRAUM DES TAGES" style={{ fontSize: 10, fontWeight: '700', color: '#6b6b70' }} />
      <TextWidget text="Was willst du im Leben noch erleben?" maxLines={2} style={{ fontSize: 14, fontWeight: '700', color: TEXT, marginTop: 4 }} />
      <TextWidget text={text} maxLines={3} truncate="END" style={{ fontSize: 12, color: MUTED, marginTop: 4 }} />
    </FlexWidget>
  );
}
