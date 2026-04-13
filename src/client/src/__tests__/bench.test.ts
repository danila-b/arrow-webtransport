import { beforeEach, describe, expect, it } from 'vitest';
import { type BenchBridge, initBenchBridge, publishBenchRunComplete, publishBenchRunStart } from '../bench.ts';
import type { QueryStats } from '../stats.ts';

const PRIMARY_WORKLOAD_ID = 'taxi_8c_0100k';
const SECONDARY_WORKLOAD_ID = 'taxi_19c_0050k';

function makeStats(overrides: Partial<QueryStats> = {}): QueryStats {
  return {
    workloadId: PRIMARY_WORKLOAD_ID,
    transportId: 'webtransport',
    connectionSetupMs: 10,
    ttfbMs: 5,
    totalTimeMs: 100,
    totalRows: 500,
    totalBytes: 10_000,
    connectionRestarts: 0,
    throughputRowsPerSec: 5_000,
    throughputMBPerSec: 0.1,
    cancelLatencyMs: null,
    longTaskCount: 0,
    longTaskTotalMs: 0,
    ...overrides,
  };
}

describe('bench bridge', () => {
  beforeEach(() => {
    (window as Window & { __bench?: BenchBridge }).__bench = undefined;
    initBenchBridge();
  });

  it('initializes an idle bridge state', () => {
    expect(window.__bench).toBeDefined();
    expect(window.__bench?.version).toBe(1);
    expect(window.__bench?.lastRun.status).toBe('idle');
    expect(window.__bench?.lastRun.runId).toBe(0);
  });

  it('publishes run start state and increments the run id', () => {
    const runId = publishBenchRunStart({
      workloadId: SECONDARY_WORKLOAD_ID,
      transportId: 'http2-arrow',
      queryText: 'SELECT 1',
    });

    expect(runId).toBe(1);
    expect(window.__bench?.lastRun).toMatchObject({
      runId: 1,
      status: 'running',
      workloadId: SECONDARY_WORKLOAD_ID,
      transportId: 'http2-arrow',
      queryText: 'SELECT 1',
      stats: null,
      errorMessage: null,
    });
    expect(window.__bench?.lastRun.startedAt).toBeTypeOf('string');
  });

  it('publishes run completion with stats payload', () => {
    const runId = publishBenchRunStart({
      workloadId: PRIMARY_WORKLOAD_ID,
      transportId: 'webtransport',
      queryText: 'SELECT * FROM yellow_taxi LIMIT 100000',
    });

    publishBenchRunComplete({
      runId,
      status: 'success',
      workloadId: PRIMARY_WORKLOAD_ID,
      transportId: 'webtransport',
      queryText: 'SELECT * FROM yellow_taxi LIMIT 100000',
      stats: makeStats(),
    });

    expect(window.__bench?.lastRun).toMatchObject({
      runId: 1,
      status: 'success',
      workloadId: PRIMARY_WORKLOAD_ID,
      transportId: 'webtransport',
      stats: makeStats(),
      errorMessage: null,
    });
    expect(window.__bench?.lastRun.completedAt).toBeTypeOf('string');
  });

  it('emits a browser event for observers', () => {
    const seenStates: string[] = [];
    const listener = (event: Event) => {
      const detail = (event as CustomEvent).detail as { status: string };
      seenStates.push(detail.status);
    };

    window.addEventListener('bench:run-state', listener);

    const runId = publishBenchRunStart({
      workloadId: PRIMARY_WORKLOAD_ID,
      transportId: 'webtransport',
      queryText: 'SELECT 1',
    });

    publishBenchRunComplete({
      runId,
      status: 'error',
      workloadId: PRIMARY_WORKLOAD_ID,
      transportId: 'webtransport',
      queryText: 'SELECT 1',
      stats: makeStats(),
      errorMessage: 'boom',
    });

    window.removeEventListener('bench:run-state', listener);

    expect(seenStates).toEqual(['running', 'error']);
  });
});
