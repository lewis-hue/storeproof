import { describe, expect, it } from 'vitest';
import { STORES, matchesSong, verifyCatalog, verifySong, type SearchBackend } from './verify';
import { createFixtureBackend } from './search';
import { DEMO_ARTIST, demoFixtures } from './fixtures';

describe('matchesSong', () => {
  it('accepts an exact title + artist match', () => {
    expect(matchesSong('Icy Love - Lewis KE. Listen now.', 'Icy Love', 'Lewis KE')).toBe(true);
  });
  it('rejects a title match with the wrong artist', () => {
    expect(matchesSong('Icy Love by Someone Else', 'Icy Love', 'Lewis KE')).toBe(false);
  });
  it('rejects a partial title', () => {
    expect(matchesSong('Love - Lewis KE', 'Icy Love', 'Lewis KE')).toBe(false);
  });
});

describe('verifySong', () => {
  it('marks a store live only with on-domain, song-matching evidence', async () => {
    const backend = createFixtureBackend({
      'Icy Love site:open.spotify.com': [{ url: 'https://open.spotify.com/track/icy-love', title: 'Icy Love - Lewis KE', snippet: 'Song by Lewis KE' }],
    });
    const report = await verifySong('Lewis KE', 'Icy Love', backend);
    expect(report.stores.find((s) => s.store === 'Spotify')).toMatchObject({ status: 'live', evidenceUrl: 'https://open.spotify.com/track/icy-love' });
    // Every other store, with no evidence, is missing (never a false live).
    expect(report.stores.find((s) => s.store === 'Apple Music')).toMatchObject({ status: 'missing', evidenceUrl: null });
  });

  it('does not mark live when the result is off-domain', async () => {
    const backend = createFixtureBackend({
      'Icy Love site:open.spotify.com': [{ url: 'https://lyrics.example.com/icy-love', title: 'Icy Love - Lewis KE', snippet: 'Song by Lewis KE' }],
    });
    const report = await verifySong('Lewis KE', 'Icy Love', backend);
    expect(report.stores.find((s) => s.store === 'Spotify')?.status).toBe('missing');
  });

  it('records a search failure as unverified, never a false missing', async () => {
    const backend: SearchBackend = async () => { throw new Error('search down'); };
    const report = await verifySong('Lewis KE', 'Icy Love', backend);
    expect(report.stores.every((s) => s.status === 'unverified')).toBe(true);
  });
});

describe('verifyCatalog', () => {
  it('produces the per-store missing-songs list from the demo catalogue', async () => {
    const backend = createFixtureBackend(demoFixtures());
    const report = await verifyCatalog(DEMO_ARTIST, ['Icy Love', 'Feelings'], backend);

    // "Feelings" is only on Spotify + Apple Music in the demo, so it is missing from the rest.
    expect(report.missingByStore['Deezer']).toContain('Feelings');
    expect(report.missingByStore['Tidal']).toEqual(expect.arrayContaining(['Icy Love', 'Feelings']));
    // "Icy Love" IS live on Spotify, so it must not appear as missing there.
    expect(report.missingByStore['Spotify'] ?? []).not.toContain('Icy Love');

    expect(report.summary.songs).toBe(2);
    expect(report.summary.stores).toBe(STORES.length);
    expect(report.summary.live + report.summary.missing + report.summary.unverified).toBe(2 * STORES.length);
  });
});
