import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildSessionArtifacts, buildSummaryRows, writeSessionAnalysis } from '../../scripts/session-analysis.mjs';

function makeRecord({
  transportId = 'webtransport',
  workloadId = 'small',
  queryCaseId = 'small',
  repetition = 1,
  result = 'success',
  errorMessage = null,
  stats = {},
} = {}) {
  return {
    schemaVersion: 1,
    runId: `${transportId}-${queryCaseId}-${repetition}`,
    recordedAt: '2026-04-13T12:00:00.000Z',
    gitSha: 'abc123',
    mode: 'bench-net',
    networkProfile: 'lan',
    baseUrl: 'https://localhost:5173',
    browser: {
      name: 'chromium',
      version: '123.0.0.0',
    },
    repetition,
    transportId,
    workloadId,
    queryCaseId,
    querySource: workloadId,
    result,
    errorMessage,
    stats:
      stats === null
        ? null
        : {
            workloadId,
            transportId,
            connectionSetupMs: 10,
            ttfbMs: 5,
            totalTimeMs: 100,
            totalRows: 1000,
            totalBytes: 1_000_000,
            connectionRestarts: 0,
            throughputRowsPerSec: 10_000,
            throughputMBPerSec: 10,
            cancelLatencyMs: null,
            longTaskCount: 0,
            longTaskTotalMs: 0,
            ...stats,
          },
  };
}

function makeManifest(tmpRoot: string) {
  return {
    schemaVersion: 1,
    createdAt: '2026-04-13T12:00:00.000Z',
    configPath: '/tmp/config.json',
    gitSha: 'abc123',
    mode: 'bench-net',
    networkProfile: 'lan',
    baseUrl: 'https://localhost:5173',
    browser: {
      name: 'chromium',
      version: '123.0.0.0',
    },
    warmupRuns: 1,
    repetitions: 2,
    transports: ['webtransport', 'http2-json'],
    workloads: ['small'],
    customQueries: [],
    resultsFile: 'results/2026-04-13T12-00-00-000Z/lan.ndjson',
    derivedFiles: {
      runsCsv: 'results/2026-04-13T12-00-00-000Z/runs.csv',
      summaryCsv: 'results/2026-04-13T12-00-00-000Z/summary.csv',
      reportMarkdown: 'results/2026-04-13T12-00-00-000Z/report.md',
    },
    totalPlannedRuns: 4,
    notes: [],
    tmpRoot,
  };
}

const tempDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })));
});

describe('buildSummaryRows', () => {
  it('groups by query case and transport and computes medians from available stats', () => {
    const rows = buildSummaryRows([
      makeRecord({
        repetition: 1,
        stats: {
          connectionSetupMs: 10,
          ttfbMs: 4,
          totalTimeMs: 90,
          throughputRowsPerSec: 11_000,
          throughputMBPerSec: 9,
        },
      }),
      makeRecord({
        repetition: 2,
        stats: {
          connectionSetupMs: 14,
          ttfbMs: 6,
          totalTimeMs: 110,
          throughputRowsPerSec: 9_000,
          throughputMBPerSec: 11,
        },
      }),
      makeRecord({
        repetition: 3,
        result: 'error',
        errorMessage: 'boom',
        stats: null,
      }),
      makeRecord({
        transportId: 'http2-json',
        repetition: 1,
        stats: { totalTimeMs: 130, throughputRowsPerSec: 8_000, throughputMBPerSec: 7 },
      }),
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({
      queryCaseId: 'small',
      transportId: 'webtransport',
      runCount: 3,
      successCount: 2,
      errorCount: 1,
      cancelledCount: 0,
      medianConnectionSetupMs: 12,
      medianTtfbMs: 5,
      medianTotalTimeMs: 100,
      medianThroughputRowsPerSec: 10_000,
      medianThroughputMBPerSec: 10,
    });
  });
});

describe('buildSessionArtifacts', () => {
  it('emits concise csv and markdown outputs for one session', () => {
    const manifest = makeManifest('/tmp/unused');
    const artifacts = buildSessionArtifacts({
      manifest,
      records: [
        makeRecord({ repetition: 1 }),
        makeRecord({
          transportId: 'http2-json',
          repetition: 1,
          result: 'cancelled',
          errorMessage: null,
          stats: { cancelLatencyMs: 12, totalTimeMs: 40 },
        }),
      ],
    });

    expect(artifacts.runsCsv).toContain('schemaVersion,runId,recordedAt');
    expect(artifacts.runsCsv).toContain('cancelLatencyMs');
    expect(artifacts.summaryCsv).toContain('medianTotalTimeMs');
    expect(artifacts.reportMarkdown).toContain('# Benchmark Session Report');
    expect(artifacts.reportMarkdown).toContain('## Outcome Summary');
    expect(artifacts.reportMarkdown).toContain('## Caveats');
    expect(artifacts.reportMarkdown).toContain('No error message recorded.');
  });
});

describe('writeSessionAnalysis', () => {
  it('writes derived artifacts beside the raw session files', async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'session-analysis-'));
    tempDirectories.push(repoRoot);

    const sessionDir = path.join(repoRoot, 'results', '2026-04-13T12-00-00-000Z');
    await fs.mkdir(sessionDir, { recursive: true });

    const manifest = makeManifest(repoRoot);
    const records = [
      makeRecord({ repetition: 1 }),
      makeRecord({
        repetition: 2,
        result: 'error',
        errorMessage: 'network lost',
        stats: null,
      }),
    ];
    await fs.writeFile(
      path.join(sessionDir, 'lan.ndjson'),
      `${records.map((record) => JSON.stringify(record)).join('\n')}\n`,
      'utf8',
    );

    const result = await writeSessionAnalysis({ repoRoot, sessionDir, manifest });

    expect(result.recordCount).toBe(2);
    expect(result.summaryRowCount).toBe(1);
    await expect(fs.readFile(path.join(sessionDir, 'runs.csv'), 'utf8')).resolves.toContain('network lost');
    await expect(fs.readFile(path.join(sessionDir, 'summary.csv'), 'utf8')).resolves.toContain('medianTotalTimeMs');
    await expect(fs.readFile(path.join(sessionDir, 'report.md'), 'utf8')).resolves.toContain('## Exceptions');
  });
});
