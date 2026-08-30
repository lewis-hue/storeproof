/**
 * StoreProof core: given an artist and their song titles, work out which of those songs are
 * actually live on each store, using web-search evidence. The output is the thing a distributor's
 * support team cannot hand you: a per-store list of missing songs, each with (or without) proof.
 *
 * Design principle, borrowed from how a careful human would check: a song is only marked LIVE when a
 * result on the store's OWN domain also matches the exact title and artist. A store we could not
 * reach is `unverified`, never a false `missing`. Precision over recall, because a false "missing"
 * would send an artist chasing a problem that is not there.
 */

export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
}

/** A pluggable search backend so the engine can run against a real SERP API or deterministic fixtures. */
export type SearchBackend = (query: string) => Promise<SearchResult[]>;

export interface Store {
  name: string;
  /** Hostnames a real track/song page lives on for this store. */
  domains: string[];
}

/** The consumer stores an independent release typically reaches. Kept intentionally small and clear. */
export const STORES: Store[] = [
  { name: 'Spotify', domains: ['open.spotify.com'] },
  { name: 'Apple Music', domains: ['music.apple.com'] },
  { name: 'YouTube Music', domains: ['music.youtube.com', 'youtube.com'] },
  { name: 'Amazon Music', domains: ['music.amazon.com'] },
  { name: 'Deezer', domains: ['deezer.com'] },
  { name: 'Tidal', domains: ['tidal.com'] },
  { name: 'Audiomack', domains: ['audiomack.com'] },
  { name: 'Boomplay', domains: ['boomplay.com'] },
];

export type Presence = 'live' | 'missing' | 'unverified';

export interface StoreVerdict {
  store: string;
  status: Presence;
  /** A link proving the song is live on this store, when found. */
  evidenceUrl: string | null;
}

export interface SongReport {
  title: string;
  artist: string;
  stores: StoreVerdict[];
}

export interface CatalogReport {
  artist: string;
  songs: SongReport[];
  /** The headline deliverable: for each store, the titles confirmed missing from it. */
  missingByStore: Record<string, string[]>;
  summary: { songs: number; stores: number; live: number; missing: number; unverified: number };
}

function normalize(value: string): string {
  return (value || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function onDomain(url: string, domains: string[]): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return domains.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

/** Strict match: the text must contain the exact (normalized) title AND every artist token. */
export function matchesSong(text: string, title: string, artist: string): boolean {
  const hay = normalize(text);
  const wantTitle = normalize(title);
  if (!wantTitle || !hay.includes(wantTitle)) return false;
  const wantArtist = normalize(artist);
  if (!wantArtist) return false;
  if (hay.includes(wantArtist)) return true;
  const tokens = wantArtist.split(' ').filter((t) => t.length >= 2);
  return tokens.length > 0 && tokens.every((t) => hay.includes(t));
}

/** Verify one song across every store with a targeted per-store query. */
export async function verifySong(artist: string, title: string, backend: SearchBackend): Promise<SongReport> {
  const stores = await Promise.all(
    STORES.map(async (store): Promise<StoreVerdict> => {
      try {
        const results = await backend(`${artist} ${title} site:${store.domains[0]}`);
        const hit = results.find((r) => onDomain(r.url, store.domains) && matchesSong(`${r.title} ${r.snippet}`, title, artist));
        return hit
          ? { store: store.name, status: 'live', evidenceUrl: hit.url }
          : { store: store.name, status: 'missing', evidenceUrl: null };
      } catch {
        return { store: store.name, status: 'unverified', evidenceUrl: null };
      }
    }),
  );
  return { title, artist, stores };
}

/** Verify a whole catalogue and roll it up into the per-store missing-songs report. */
export async function verifyCatalog(artist: string, titles: string[], backend: SearchBackend): Promise<CatalogReport> {
  const songs = await Promise.all(titles.map((t) => verifySong(artist, t, backend)));

  const missingByStore: Record<string, string[]> = {};
  const summary = { songs: songs.length, stores: STORES.length, live: 0, missing: 0, unverified: 0 };
  for (const song of songs) {
    for (const verdict of song.stores) {
      if (verdict.status === 'live') summary.live += 1;
      else if (verdict.status === 'unverified') summary.unverified += 1;
      else {
        summary.missing += 1;
        (missingByStore[verdict.store] ??= []).push(song.title);
      }
    }
  }
  return { artist, songs, missingByStore, summary };
}
