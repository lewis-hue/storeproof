import type { SearchBackend, SearchResult } from './verify';

/**
 * Live backend: Serper (https://serper.dev), a hosted Google SERP API. The API key stays server-side;
 * it is never shipped to the browser. A non-2xx response throws, which the engine records as
 * `unverified` for that store rather than a false `missing`.
 */
export function createSerperBackend(apiKey: string, endpoint = 'https://google.serper.dev/search'): SearchBackend {
  return async (query) => {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({ q: query, num: 10 }),
    });
    if (!res.ok) throw new Error(`Serper request failed: ${res.status}`);
    const body = (await res.json()) as { organic?: Array<{ link?: string; title?: string; snippet?: string }> };
    return (body.organic ?? []).map((o) => ({ url: o.link ?? '', title: o.title ?? '', snippet: o.snippet ?? '' }));
  };
}

/**
 * Deterministic backend for demo mode and tests: returns the canned results whose key is a substring
 * of the query. No network, fully reproducible.
 */
export function createFixtureBackend(fixtures: Record<string, SearchResult[]>): SearchBackend {
  return async (query) => {
    for (const [needle, results] of Object.entries(fixtures)) {
      if (query.includes(needle)) return results;
    }
    return [];
  };
}
