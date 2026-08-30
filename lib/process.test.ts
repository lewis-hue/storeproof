import { describe, expect, it } from 'vitest';
import { processVerifyJob } from './process';

describe('processVerifyJob (the worker unit of work)', () => {
  it('runs the demo catalogue with no Serper key and returns a per-store report', async () => {
    const result = await processVerifyJob({ artist: 'Lewis KE', titles: ['Icy Love', 'Feelings'] }, {});
    expect(result.mode).toBe('demo');
    expect(result.report.summary.songs).toBe(2);
    // Feelings is only on Spotify + Apple Music in the demo, so it is missing from Tidal.
    expect(result.report.missingByStore['Tidal']).toEqual(expect.arrayContaining(['Icy Love', 'Feelings']));
    expect(result.report.missingByStore['Spotify'] ?? []).not.toContain('Icy Love');
  });
});
