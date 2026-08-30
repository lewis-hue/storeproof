import { Worker } from 'bullmq';
import { VERIFY_QUEUE, createRedis, type VerifyJobData, type VerifyJobResult } from '../lib/queue';
import { processVerifyJob } from '../lib/process';

/**
 * The compute tier. A standalone process (not the web server) that consumes verification jobs from
 * Redis and runs the per-store searching. Scale throughput by running more replicas of this process;
 * the web tier is unaffected. Concurrency bounds how many jobs one replica runs at once.
 */
const concurrency = Math.max(1, Math.min(32, Number(process.env.WORKER_CONCURRENCY) || 4));

function log(level: string, msg: string, extra: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ level, msg, ...extra }));
}

const worker = new Worker<VerifyJobData, VerifyJobResult>(
  VERIFY_QUEUE,
  (job) => processVerifyJob(job.data),
  { connection: createRedis(), concurrency },
);

worker.on('completed', (job) => log('info', 'job.completed', { jobId: job.id, songs: job.data.titles.length }));
worker.on('failed', (job, err) => log('error', 'job.failed', { jobId: job?.id, error: err.message }));
worker.on('error', (err) => log('error', 'worker.error', { error: err.message }));

log('info', 'worker.started', { queue: VERIFY_QUEUE, concurrency, mode: process.env.SERPER_API_KEY ? 'live' : 'demo' });

async function shutdown(): Promise<void> {
  log('info', 'worker.shutdown');
  await worker.close();
  process.exit(0);
}
process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());
