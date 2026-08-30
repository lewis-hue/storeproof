import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import type { CatalogReport } from './verify';

/**
 * The seam that decouples the web tier from the compute tier. The Next.js API only ever ENQUEUES a
 * verification job here; a separate worker process (worker/index.ts) consumes it and does the actual
 * per-store searching. This mirrors the large Catalog Sentinel's BullMQ + Redis pipeline: the web
 * stays responsive and the slow, rate-limited work scales horizontally by adding worker replicas.
 */
export const VERIFY_QUEUE = 'verify';

export interface VerifyJobData {
  artist: string;
  titles: string[];
}

export interface VerifyJobResult {
  mode: 'live' | 'demo';
  report: CatalogReport;
}

/**
 * A Redis connection tuned for BullMQ. `maxRetriesPerRequest: null` is required so BullMQ's blocking
 * commands are not aborted; each process (web producer, worker consumer) owns its own connection.
 */
export function createRedis(): IORedis {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  return new IORedis(url, { maxRetriesPerRequest: null, enableReadyCheck: false });
}

let queue: Queue<VerifyJobData, VerifyJobResult> | null = null;

/** Singleton producer queue for the web process. Jobs retry with backoff and self-expire. */
export function verifyQueue(): Queue<VerifyJobData, VerifyJobResult> {
  if (!queue) {
    queue = new Queue<VerifyJobData, VerifyJobResult>(VERIFY_QUEUE, {
      connection: createRedis(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { age: 3600, count: 1000 },
        removeOnFail: { age: 3600, count: 1000 },
      },
    });
  }
  return queue;
}
