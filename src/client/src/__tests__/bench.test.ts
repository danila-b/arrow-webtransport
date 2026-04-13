import { beforeEach, describe, expect, it } from 'vitest';
import {
  initBenchBridge,
  publishBenchRunComplete,
  publishBenchRunStart,
  type BenchBridge,
} from '../bench.ts';
import type { QueryStats } from '../stats.ts';

function makeStats(overrides: Partial<QueryStats> = {}): QueryStats {
  return {
    workloadId: 'small',
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
    delete (window as Window & { __bench?: BenchBridge }).__bench;
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
      workloadId: 'medium',
      transportId: 'http2-arrow',
      queryText: 'SELECT 1',
    });

    expect(runId).toBe(1);
    expect(window.__bench?.lastRun).toMatchObject({
      runId: 1,
      status: 'running',
      workloadId: 'medium',
      transportId: 'http2-arrow',
      queryText: 'SELECT 1',
      stats: null,
      errorMessage: null,
    });
    expect(window.__bench?.lastRun.startedAt).toBeTypeOf('string');
  });

  it('publishes run completion with stats payload', () => {
    const runId = publishBenchRunStart({
      workloadId: 'small',
      transportId: 'webtransport',
      queryText: 'SELECT * FROM yellow_taxi LIMIT 500',
    });

    publishBenchRunComplete({
      runId,
      status: 'success',
      workloadId: 'small',
      transportId: 'webtransport',
      queryText: 'SELECT * FROM yellow_taxi LIMIT 500',
      stats: makeStats(),
    });

    expect(window.__bench?.lastRun).toMatchObject({
      runId: 1,
      status: 'success',
      workloadId: 'small',
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
      workloadId: 'small',
      transportId: 'webtransport',
      queryText: 'SELECT 1',
    });

    publishBenchRunComplete({
      runId,
      status: 'error',
      workloadId: 'small',
      transportId: 'webtransport',
      queryText: 'SELECT 1',
      stats: makeStats(),
      errorMessage: 'boom',
    });

    window.removeEventListener('bench:run-state', listener);

    expect(seenStates).toEqual(['running', 'error']);
  });
});
