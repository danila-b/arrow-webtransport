import type { QueryStats } from './stats.ts';

export type BenchRunStatus = 'idle' | 'running' | 'success' | 'error' | 'cancelled';

export interface BenchRunState {
  runId: number;
  status: BenchRunStatus;
  startedAt: string | null;
  completedAt: string | null;
  workloadId: string | null;
  transportId: string | null;
  queryText: string | null;
  stats: QueryStats | null;
  errorMessage: string | null;
}

export interface BenchBridge {
  version: number;
  lastRun: BenchRunState;
}

declare global {
  interface Window {
    __bench?: BenchBridge;
  }
}

const INITIAL_RUN_STATE: BenchRunState = {
  runId: 0,
  status: 'idle',
  startedAt: null,
  completedAt: null,
  workloadId: null,
  transportId: null,
  queryText: null,
  stats: null,
  errorMessage: null,
};

function getBenchBridge(): BenchBridge {
  if (!window.__bench) {
    window.__bench = {
      version: 1,
      lastRun: { ...INITIAL_RUN_STATE },
    };
  }

  return window.__bench;
}

function publishBenchState(nextState: BenchRunState): void {
  const bridge = getBenchBridge();
  bridge.lastRun = nextState;
  window.dispatchEvent(new CustomEvent<BenchRunState>('bench:run-state', { detail: nextState }));
}

export function initBenchBridge(): void {
  getBenchBridge();
}

export interface BenchRunStartPayload {
  workloadId: string | null;
  transportId: string | null;
  queryText: string;
}

export function publishBenchRunStart(payload: BenchRunStartPayload): number {
  const bridge = getBenchBridge();
  const runId = bridge.lastRun.runId + 1;

  publishBenchState({
    runId,
    status: 'running',
    startedAt: new Date().toISOString(),
    completedAt: null,
    workloadId: payload.workloadId,
    transportId: payload.transportId,
    queryText: payload.queryText,
    stats: null,
    errorMessage: null,
  });

  return runId;
}

export interface BenchRunCompletePayload extends BenchRunStartPayload {
  runId: number;
  status: Exclude<BenchRunStatus, 'idle' | 'running'>;
  stats: QueryStats;
  errorMessage?: string | null;
}

export function publishBenchRunComplete(payload: BenchRunCompletePayload): void {
  publishBenchState({
    runId: payload.runId,
    status: payload.status,
    startedAt: getBenchBridge().lastRun.startedAt,
    completedAt: new Date().toISOString(),
    workloadId: payload.workloadId,
    transportId: payload.transportId,
    queryText: payload.queryText,
    stats: payload.stats,
    errorMessage: payload.errorMessage ?? null,
  });
}
