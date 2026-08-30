import { describe, expect, it } from 'vitest';
import { buildSupportEmail } from './email';
import type { CatalogReport } from './verify';

const report: CatalogReport = {
  artist: 'Lewis KE',
  songs: [],
  missingByStore: { Deezer: ['Icy Love', 'Feelings'], Tidal: ['Feelings'] },
  summary: { songs: 2, stores: 8, live: 10, missing: 3, unverified: 0 },
};

describe('buildSupportEmail', () => {
  it('itemises every missing song under its store and names the artist', () => {
    const email = buildSupportEmail(report)!;
    expect(email).not.toBeNull();
    expect(email.subject).toContain('Lewis KE');
    expect(email.subject).toContain('3'); // 3 total missing deliveries
    expect(email.body).toContain('Deezer:');
    expect(email.body).toContain('  - Icy Love');
    expect(email.body).toContain('  - Feelings');
    expect(email.body).toContain('Tidal:');
    expect(email.body.trim().endsWith('Lewis KE')).toBe(true);
  });

  it('returns null when nothing is missing (no email to send)', () => {
    expect(buildSupportEmail({ ...report, missingByStore: {} })).toBeNull();
  });
});
