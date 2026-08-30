import { NextRequest, NextResponse } from 'next/server';
import { verifyCatalog } from '@/lib/verify';
import { createFixtureBackend, createSerperBackend } from '@/lib/search';
import { demoFixtures } from '@/lib/fixtures';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST { artist, titles[] } -> the per-store verification report.
 * With SERPER_API_KEY set, verification is LIVE against real search results; without it, the request
 * is served in DEMO mode from the built-in sample catalogue so anyone can try it with zero setup.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = (await req.json().catch(() => ({}))) as { artist?: string; titles?: string[] };
  const artist = (body.artist ?? '').trim();
  const titles = (body.titles ?? []).map((t) => (t ?? '').trim()).filter(Boolean).slice(0, 25);
  if (!artist || titles.length === 0) {
    return NextResponse.json({ error: 'Enter an artist and at least one song title.' }, { status: 400 });
  }

  const key = process.env.SERPER_API_KEY?.trim();
  const backend = key ? createSerperBackend(key) : createFixtureBackend(demoFixtures());
  try {
    const report = await verifyCatalog(artist, titles, backend);
    return NextResponse.json({ mode: key ? 'live' : 'demo', report });
  } catch {
    return NextResponse.json({ error: 'Verification failed. Please try again.' }, { status: 502 });
  }
}
