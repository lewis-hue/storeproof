import { NextRequest, NextResponse } from 'next/server';
import { verifyQueue } from '@/lib/queue';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/verify/:jobId -> the job's state, and its result once complete. The client polls this
 * while the worker processes the job, so the web request never blocks on the slow verification.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ jobId: string }> }): Promise<NextResponse> {
  const { jobId } = await params;
  try {
    const job = await verifyQueue().getJob(jobId);
    if (!job) return NextResponse.json({ status: 'not-found' }, { status: 404 });

    const state = await job.getState();
    if (state === 'completed') {
      return NextResponse.json({ status: 'completed', ...(job.returnvalue as object) });
    }
    if (state === 'failed') {
      return NextResponse.json({ status: 'failed', error: job.failedReason ?? 'Verification failed.' });
    }
    // waiting | active | delayed | paused
    return NextResponse.json({ status: state === 'active' ? 'active' : 'queued' });
  } catch {
    return NextResponse.json({ error: 'The verification queue is unavailable.' }, { status: 503 });
  }
}
