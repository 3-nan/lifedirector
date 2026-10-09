// Supabase Edge Function "dream-image" (siehe ROADMAP.md, "Fotos (automatisch)").
// Läuft in Deno, nicht in der App — deshalb vom App-tsconfig ausgenommen.
//
// POST { dream_id }                 → neues Bild: Tageslimit buchen → KI-Aufruf #1
//   (Suchbegriffe) → Unsplash-Suche → KI-Aufruf #2 (Kandidaten ranken) → speichern.
// POST { dream_id, action: "next" } → "Anderes Bild": nächster gespeicherter
//   Kandidat, ohne KI und ohne Tageslimit.
//
// Liefert die KI nichts Brauchbares oder findet die Suche nichts, bleibt der
// Traum, wie er ist (Antwort { image: null }), statt einen Fehler zu melden.
//
// Secrets (nie im Code, nur im Supabase-Dashboard bzw. `supabase secrets set`):
//   ANTHROPIC_API_KEY, UNSPLASH_ACCESS_KEY
// SUPABASE_URL und SUPABASE_ANON_KEY stellt Supabase automatisch bereit.

import Anthropic from 'npm:@anthropic-ai/sdk@0.132.1';
import { createClient } from 'npm:@supabase/supabase-js@2.112.4';

const MODEL = 'claude-haiku-5-5';
const MAX_CANDIDATES = 6;
/** utm_source für die Unsplash-Pflichtlinks (Attribution). */
const UNSPLASH_APP = 'lifedirector';

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

type DreamText = {
  id: string;
  title: string;
  feeling: string | null;
  why: string | null;
};

/** Ein Unsplash-Foto, wie es in `dreams.image_candidates` gespeichert wird. */
type Candidate = {
  id: string;
  url: string; // urls.regular (1080 px breit) — Anzeige in der App
  thumb: string; // urls.small (400 px) — für KI-Aufruf #2
  credit: string; // Name des Fotografen
  credit_url: string; // Profil des Fotografen, mit utm-Parametern
  download_location: string; // muss bei Verwendung angepingt werden (Unsplash-Regel)
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function dreamPrompt(dream: DreamText): string {
  const lines = [`Dream: ${dream.title}`];
  if (dream.feeling) lines.push(`How it will feel: ${dream.feeling}`);
  if (dream.why) lines.push(`Why it matters: ${dream.why}`);
  return lines.join('\n');
}

/** Text des ersten Text-Blocks als JSON, oder null bei Abbruch/Verweigerung. */
function parseJson<T>(response: Anthropic.Message): T | null {
  if (response.stop_reason !== 'end_turn') return null;
  const text = response.content.find((b) => b.type === 'text');
  if (!text || text.type !== 'text') return null;
  return JSON.parse(text.text) as T;
}

// Gilt für beide KI-Aufrufe: woran man ein gutes Traum-Foto erkennt.
const PHOTO_CRITERIA = `What makes a good photo here:
- the moment of living the dream, not preparing for it or the obstacle on the way
- if a person is shown, from behind, in silhouette or at a distance, so the user
  can imagine themselves in it; no posed portraits or faces looking into the camera
- warm and hopeful mood: natural light, golden hour, open space
- no products, logos, screens or written text as the subject`;

// ---- KI-Aufruf #1: Traum → drei englische Foto-Suchbegriffe ---------------
// Drei Stufen von konkret bis allgemein. Gesucht wird mit der ersten; die
// weiteren nur, wenn die vorherige gar nichts findet.

const QUERY_SYSTEM = `You help a personal growth app find a photo for a user's dream or life goal.
The photo appears on the user's dream board and home screen widget, so it should
make them feel what it would be like to live that dream, every time they see it.

You will get the dream's title (usually German) and sometimes how it will feel and
why it matters. Write three English search queries for Unsplash, from specific
to general:

- specific: the concrete scene of the dream fulfilled, 4-7 words
- broader: the same scene with fewer details, 3-5 words
- general: the core activity or place, 2-3 words, which will always find photos

How the search works: it matches keywords against photo tags, so describe what
is visible in the picture (person, activity, place, light), never abstract ideas
like "freedom", "success" or "happiness" on their own. Keep place names
("Thailand", "Lisbon") in at least the first two queries.

${PHOTO_CRITERIA}

For abstract dreams (money, calm, confidence), pick a scene that shows the
outcome in everyday life rather than a symbol (no piggy banks, no light bulbs).

Examples:
"Surfen lernen" → specific "surfer riding first wave at sunrise",
  broader "surfer riding wave", general "surfing"
"Reise nach Thailand" → specific "traveler on Thailand beach longtail boat",
  broader "Thailand beach traveler", general "tropical beach"
"Einen Marathon laufen" → specific "runner crossing marathon finish line",
  broader "marathon runner city", general "running"
"Finanziell frei sein" → specific "woman reading on porch at sunset",
  broader "relaxed morning coffee view", general "calm morning"`;

const QUERY_SCHEMA = {
  type: 'object',
  properties: {
    specific: { type: 'string' },
    broader: { type: 'string' },
    general: { type: 'string' },
  },
  required: ['specific', 'broader', 'general'],
  additionalProperties: false,
};

type SearchQueries = { specific: string; broader: string; general: string };

/** Die drei Suchbegriffe in Suchreihenfolge, ohne leere und doppelte. */
async function searchQueriesFor(dream: DreamText): Promise<string[]> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: QUERY_SCHEMA } },
    system: QUERY_SYSTEM,
    messages: [{ role: 'user', content: dreamPrompt(dream) }],
  });
  const q = parseJson<SearchQueries>(response);
  if (!q) return [];
  const queries = [q.specific, q.broader, q.general].map((s) => s.trim()).filter(Boolean);
  return [...new Set(queries)];
}

// ---- Unsplash ----------------------------------------------------------------

function unsplashHeaders(): HeadersInit {
  return {
    Authorization: `Client-ID ${Deno.env.get('UNSPLASH_ACCESS_KEY')}`,
    'Accept-Version': 'v1',
  };
}

function withUtm(url: string): string {
  return `${url}?utm_source=${UNSPLASH_APP}&utm_medium=referral`;
}

type UnsplashPhoto = {
  id: string;
  urls: { regular: string; small: string };
  user: { name: string; links: { html: string } };
  links: { download_location: string };
};

async function searchUnsplash(query: string): Promise<Candidate[]> {
  const params = new URLSearchParams({
    query,
    per_page: String(MAX_CANDIDATES),
    content_filter: 'high',
  });
  const res = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
    headers: unsplashHeaders(),
  });
  if (!res.ok) throw new Error(`unsplash search ${res.status}`);
  const { results } = (await res.json()) as { results: UnsplashPhoto[] };
  return results.map((p) => ({
    id: p.id,
    url: p.urls.regular,
    thumb: p.urls.small,
    credit: p.user.name,
    credit_url: withUtm(p.user.links.html),
    download_location: p.links.download_location,
  }));
}

/** Kandidaten der ersten Suchstufe, die überhaupt etwas findet. */
async function findCandidates(queries: string[]): Promise<Candidate[]> {
  for (const query of queries) {
    const candidates = await searchUnsplash(query);
    if (candidates.length > 0) return candidates;
  }
  return [];
}

/** Unsplash verlangt diesen Ping, sobald ein Foto tatsächlich verwendet wird. */
async function trackDownload(candidate: Candidate): Promise<void> {
  try {
    await fetch(candidate.download_location, { headers: unsplashHeaders() });
  } catch (e) {
    console.error('unsplash download ping failed', e);
  }
}

// ---- KI-Aufruf #2: Kandidaten nach Passung ranken -----------------------------

const PICK_SYSTEM = `You help a personal growth app pick a photo for a user's dream or life goal.
The photo appears on the user's dream board and home screen widget, so it should
make them feel what it would be like to live that dream, every time they see it.

You will get the dream (usually German) and numbered candidate photos. Rank all
of them from best to worst fit, as a list of their numbers.

${PHOTO_CRITERIA}

Also rank lower: photos that don't match the dream at all, heavy filters or
editing, and photos where the main subject is hard to make out at small size.`;

const PICK_SCHEMA = {
  type: 'object',
  properties: { ranking: { type: 'array', items: { type: 'integer' } } },
  required: ['ranking'],
  additionalProperties: false,
};

/**
 * Kandidaten in KI-Reihenfolge. Fehlende Nummern hängt die Funktion hinten
 * an, damit "Anderes Bild" alle Kandidaten durchgehen kann. Leer, wenn die KI
 * nichts Brauchbares liefert.
 */
async function rankCandidates(dream: DreamText, candidates: Candidate[]): Promise<Candidate[]> {
  const content: Anthropic.ContentBlockParam[] = [{ type: 'text', text: dreamPrompt(dream) }];
  candidates.forEach((c, i) => {
    content.push({ type: 'text', text: `Photo ${i}:` });
    content.push({ type: 'image', source: { type: 'url', url: c.thumb } });
  });

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: PICK_SCHEMA } },
    system: PICK_SYSTEM,
    messages: [{ role: 'user', content }],
  });
  const result = parseJson<{ ranking: number[] }>(response);
  if (!result) return [];

  const order = [...new Set(result.ranking)].filter(
    (i) => Number.isInteger(i) && i >= 0 && i < candidates.length,
  );
  if (order.length === 0) return [];
  candidates.forEach((_, i) => {
    if (!order.includes(i)) order.push(i);
  });
  return order.map((i) => candidates[i]);
}

// ---- Speichern ---------------------------------------------------------------

function imageFields(candidate: Candidate) {
  return {
    image_url: candidate.url,
    image_credit: candidate.credit,
    image_credit_url: candidate.credit_url,
    image_source: 'unsplash',
  };
}

// ---- Handler -----------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  // Client mit dem Token des Aufrufers: RLS gilt, man sieht nur eigene Träume.
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return json({ error: 'unauthorized' }, 401);

  const { dream_id, action } = (await req.json().catch(() => ({}))) as {
    dream_id?: string;
    action?: 'next';
  };
  if (!dream_id) return json({ error: 'missing_dream_id' }, 400);

  // "Anderes Bild": nächster gespeicherter Kandidat, am Ende wieder von vorn.
  if (action === 'next') {
    const { data: stored } = await supabase
      .from('dreams')
      .select('id, image_candidates, image_index')
      .eq('id', dream_id)
      .maybeSingle<{ id: string; image_candidates: Candidate[] | null; image_index: number }>();
    if (!stored) return json({ error: 'not_found' }, 404);
    const candidates = stored.image_candidates ?? [];
    if (candidates.length < 2) return json({ image: null });

    const index = (stored.image_index + 1) % candidates.length;
    const next = candidates[index];
    await supabase
      .from('dreams')
      .update({ ...imageFields(next), image_index: index })
      .eq('id', stored.id);
    await trackDownload(next);
    return json({ image: imageFields(next) });
  }

  const { data: dream } = await supabase
    .from('dreams')
    .select('id, title, feeling, why')
    .eq('id', dream_id)
    .maybeSingle<DreamText>();
  if (!dream) return json({ error: 'not_found' }, 404);

  const { data: allowed, error: claimError } = await supabase.rpc('claim_image_call', {
    p_dream_id: dream.id,
  });
  if (claimError) return json({ error: 'claim_failed' }, 500);
  if (!allowed) return json({ error: 'daily_limit' }, 429);

  // Ab hier gilt die Suche als versucht — auch wenn sie nichts findet. Beim
  // Tageslimit (oben) bleibt der Traum offen und kommt am nächsten Tag dran.
  await supabase.from('dreams').update({ image_attempted: true }).eq('id', dream.id);

  let ranked: Candidate[] = [];
  let queries: string[] = [];
  try {
    queries = await searchQueriesFor(dream);
    if (queries.length === 0) return json({ image: null });

    const candidates = await findCandidates(queries);
    if (candidates.length === 0) return json({ queries, image: null });

    ranked = await rankCandidates(dream, candidates);
  } catch (e) {
    console.error('dream image failed', e);
    return json({ image: null });
  }
  if (ranked.length === 0) return json({ queries, image: null });

  const chosen = ranked[0];
  await supabase
    .from('dreams')
    .update({
      ...imageFields(chosen),
      image_queries: queries,
      image_candidates: ranked,
      image_index: 0,
    })
    .eq('id', dream.id);
  await trackDownload(chosen);

  return json({ queries, image: imageFields(chosen) });
});
