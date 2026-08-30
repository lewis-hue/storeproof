import type { VerifyJobData, VerifyJobResult } from './queue';
import { verifyCatalog } from './verify';
import { createFixtureBackend, createSerperBackend } from './search';
import { demoFixtures } from './fixtures';

/**
 * The unit of work a worker runs for one verification job, extracted from the BullMQ worker so the
 * compute logic is testable without Redis. Live (Serper) when a key is set, demo (fixtures) otherwise.
 */
export async function processVerifyJob(
  data: VerifyJobData,
  env: Record<string, string | undefined> = process.env,
): Promise<VerifyJobResult> {
  const key = env.SERPER_API_KEY?.trim();
  const backend = key ? createSerperBackend(key) : createFixtureBackend(demoFixtures());
  const report = await verifyCatalog(data.artist, data.titles, backend);
  return { mode: key ? 'live' : 'demo', report };
}
