import { STORES, type SearchResult } from './verify';

/**
 * Demo catalogue. Modelled on a real independent artist so the demo tells a true-to-life story:
 * some songs are live everywhere, others are silently missing from several stores. This is exactly
 * the situation that sends an artist into a support back-and-forth with no answer.
 */
export const DEMO_ARTIST = 'Lewis KE';
export const DEMO_SONGS = ['Icy Love', 'Sunshine', 'Feelings', 'Now'];

/** song -> the store NAMES it is actually live on in the demo. Everything else reads as missing. */
const LIVE_ON: Record<string, string[]> = {
  'Icy Love': ['Spotify', 'Apple Music', 'YouTube Music', 'Audiomack', 'Boomplay'],
  Sunshine: ['Spotify', 'Apple Music', 'YouTube Music', 'Deezer'],
  Feelings: ['Spotify', 'Apple Music'],
  Now: ['Spotify', 'Apple Music', 'YouTube Music', 'Amazon Music', 'Deezer', 'Audiomack', 'Boomplay'],
};

function domainOf(storeName: string): string {
  return STORES.find((s) => s.name === storeName)?.domains[0] ?? '';
}

function result(domain: string, artist: string, title: string): SearchResult {
  const path = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return {
    url: `https://${domain}/track/${path}`,
    title: `${title} - ${artist}`,
    snippet: `Listen to ${title} by ${artist}. Song. 2024.`,
  };
}

/** Build the fixture map keyed to match the engine's per-store `<title> site:<domain>` queries. */
export function demoFixtures(): Record<string, SearchResult[]> {
  const fixtures: Record<string, SearchResult[]> = {};
  for (const [title, storeNames] of Object.entries(LIVE_ON)) {
    for (const name of storeNames) {
      const domain = domainOf(name);
      if (domain) fixtures[`${title} site:${domain}`] = [result(domain, DEMO_ARTIST, title)];
    }
  }
  return fixtures;
}
