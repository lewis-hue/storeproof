import { NextRequest, NextResponse } from 'next/server';
import { verifyQueue } from '@/lib/queue';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST { artist, titles[] } -> 202 { jobId }. The web tier only ENQUEUES; a worker does the work.
 * Poll GET /api/verify/:jobId for the result. Verification runs LIVE with SERPER_API_KEY set,
 * otherwise in DEMO mode from the built-in sample catalogue.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = (await req.json().catch(() => ({}))) as { artist?: string; titles?: string[] };
  const artist = (body.artist ?? '').trim();
  const titles = (body.titles ?? []).map((t) => (t ?? '').trim()).filter(Boolean).slice(0, 25);
  if (!artist || titles.length === 0) {
    return NextResponse.json({ error: 'Enter an artist and at least one song title.' }, { status: 400 });
  }

  try {
    const job = await verifyQueue().add('verify', { artist, titles });
    return NextResponse.json({ jobId: job.id }, { status: 202 });
  } catch {
    return NextResponse.json(
      { error: 'The verification queue is unavailable. Is Redis running? Start the stack with `docker compose up`.' },
      { status: 503 },
    );
  }
}
