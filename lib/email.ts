import type { CatalogReport } from './verify';

export interface SupportEmail {
  subject: string;
  body: string;
}

/**
 * Turn the missing-songs report into a ready-to-send re-distribution request for the distributor's
 * support team. This is the payoff of the whole tool: the artist stops describing the problem in a
 * back-and-forth and instead hands support the exact, itemised list of what to re-deliver where.
 */
export function buildSupportEmail(report: CatalogReport): SupportEmail | null {
  const missing = Object.entries(report.missingByStore).filter(([, titles]) => titles.length > 0);
  if (missing.length === 0) return null;
  const totalGaps = missing.reduce((n, [, titles]) => n + titles.length, 0);

  const lines: string[] = [
    'Hi Support Team,',
    '',
    `I distribute my music as ${report.artist}. Several of my songs are not showing up on stores where they should be live. Could you please re-deliver the following to the listed stores:`,
    '',
  ];
  for (const [store, titles] of missing) {
    lines.push(`${store}:`);
    for (const title of titles) lines.push(`  - ${title}`);
    lines.push('');
  }
  lines.push(
    'I confirmed each of these with a targeted per-store search and could not find a live page for the song on that store. Please confirm once re-distribution has been triggered.',
    '',
    'Thank you,',
    report.artist,
  );

  return {
    subject: `Re-distribution request: ${totalGaps} missing store deliveries for ${report.artist}`,
    body: lines.join('\n'),
  };
}
