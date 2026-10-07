"use no memo";
// ^ Pflicht: Die Widget-Bibliothek ruft diese Komponenten als normale
// Funktionen auf (außerhalb von React). Der in app.json aktivierte React
// Compiler würde sie sonst mit Hooks umschreiben → "Invalid hook call" →
// "Error rendering widget" in der Vorschau und auf dem Startbildschirm.

import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { dreamColor } from '../lib/dreams';
import { Dream } from '../types/dream';

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

const TEXT: Hex = '#1c1c1e';
const MUTED: Hex = '#555555';

/** Ab dieser Breite (dp) das breite Layout mit Kopfzeile und Schritt-Box. */
const MEDIUM_MIN_WIDTH = 220;

export function DreamWidget({
  dream,
  step,
  mode,
  state,
  width,
  variant = 'standard',
}: {
  dream: Dream | null;
  /** Festgelegter nächster Schritt oder der Schritt, der diese Woche läuft. */
  step: string | null;
  mode: DreamWidgetMode;
  state: DreamWidgetState;
  width: number;
  variant?: DreamWidgetVariant;
}) {
  if (state !== 'ok' || !dream) {
    return variant === 'mini' || variant === 'row' ? <EmptyMiniWidget /> : <EmptyWidget state={state} />;
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
