import fs from 'node:fs/promises';
import path from 'node:path';

export const RUNS_CSV_COLUMNS = [
  'schemaVersion',
  'runId',
  'recordedAt',
  'gitSha',
  'mode',
  'networkProfile',
  'baseUrl',
  'browserName',
  'browserVersion',
  'repetition',
  'transportId',
  'workloadId',
  'queryCaseId',
  'querySource',
  'result',
  'errorMessage',
  'statsWorkloadId',
  'statsTransportId',
  'connectionSetupMs',
  'ttfbMs',
  'totalTimeMs',
  'totalRows',
  'totalBytes',
  'connectionRestarts',
  'throughputRowsPerSec',
  'throughputMBPerSec',
  'cancelLatencyMs',
  'longTaskCount',
  'longTaskTotalMs',
];

export const SUMMARY_CSV_COLUMNS = [
  'mode',
  'networkProfile',
  'workloadId',
  'queryCaseId',
  'transportId',
  'runCount',
  'successCount',
  'errorCount',
  'cancelledCount',
  'medianConnectionSetupMs',
  'medianTtfbMs',
  'medianTotalTimeMs',
  'medianThroughputRowsPerSec',
  'medianThroughputMBPerSec',
];

const SUMMARY_METRICS = [
  ['connectionSetupMs', 'medianConnectionSetupMs'],
  ['ttfbMs', 'medianTtfbMs'],
  ['totalTimeMs', 'medianTotalTimeMs'],
  ['throughputRowsPerSec', 'medianThroughputRowsPerSec'],
  ['throughputMBPerSec', 'medianThroughputMBPerSec'],
];

function csvEscape(value) {
  if (value === null || value === undefined) {
    return '';
  }

  const text = String(value);
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

export function serializeCsv(rows, columns) {
  const lines = [columns.join(','), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(','))];

  return `${lines.join('\n')}\n`;
}

export function parseNdjson(contents) {
  return contents
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));
}

export function median(values) {
  const sorted = values.filter((value) => Number.isFinite(value)).toSorted((left, right) => left - right);

  if (sorted.length === 0) {
    return null;
  }

  const middleIndex = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middleIndex];
  }

  return (sorted[middleIndex - 1] + sorted[middleIndex]) / 2;
}

function getMetricValue(record, field) {
  const value = record.stats?.[field];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function flattenRunRecord(record) {
  const stats = record.stats ?? {};

  return {
    schemaVersion: record.schemaVersion,
    runId: record.runId,
    recordedAt: record.recordedAt,
    gitSha: record.gitSha,
    mode: record.mode,
    networkProfile: record.networkProfile,
    baseUrl: record.baseUrl,
    browserName: record.browser?.name ?? null,
    browserVersion: record.browser?.version ?? null,
    repetition: record.repetition,
    transportId: record.transportId,
    workloadId: record.workloadId,
    queryCaseId: record.queryCaseId,
    querySource: record.querySource,
    result: record.result,
    errorMessage: record.errorMessage,
    statsWorkloadId: stats.workloadId ?? null,
    statsTransportId: stats.transportId ?? null,
    connectionSetupMs: stats.connectionSetupMs ?? null,
    ttfbMs: stats.ttfbMs ?? null,
    totalTimeMs: stats.totalTimeMs ?? null,
    totalRows: stats.totalRows ?? null,
    totalBytes: stats.totalBytes ?? null,
    connectionRestarts: stats.connectionRestarts ?? null,
    throughputRowsPerSec: stats.throughputRowsPerSec ?? null,
    throughputMBPerSec: stats.throughputMBPerSec ?? null,
    cancelLatencyMs: stats.cancelLatencyMs ?? null,
    longTaskCount: stats.longTaskCount ?? null,
    longTaskTotalMs: stats.longTaskTotalMs ?? null,
  };
}

function makeSummaryKey(record) {
  return `${record.queryCaseId}::${record.transportId}`;
}

function compareSummaryRows(left, right) {
  return left.queryCaseId.localeCompare(right.queryCaseId) || left.transportId.localeCompare(right.transportId);
}

export function buildSummaryRows(records) {
  const groups = new Map();

  for (const record of records) {
    const key = makeSummaryKey(record);
    const group = groups.get(key) ?? [];
    group.push(record);
    groups.set(key, group);
  }

  const summaryRows = [];
  for (const groupRecords of groups.values()) {
    const first = groupRecords[0];
    const successCount = groupRecords.filter((record) => record.result === 'success').length;
    const errorCount = groupRecords.filter((record) => record.result === 'error').length;
    const cancelledCount = groupRecords.filter((record) => record.result === 'cancelled').length;

    const row = {
      mode: first.mode,
      networkProfile: first.networkProfile,
      workloadId: first.workloadId,
      queryCaseId: first.queryCaseId,
      transportId: first.transportId,
      runCount: groupRecords.length,
      successCount,
      errorCount,
      cancelledCount,
    };

    for (const [field, outputColumn] of SUMMARY_METRICS) {
      row[outputColumn] = median(groupRecords.map((record) => getMetricValue(record, field)));
    }

    summaryRows.push(row);
  }

  return summaryRows.toSorted(compareSummaryRows);
}

function formatMetric(value, fractionDigits = 2) {
  if (value === null || value === undefined) {
    return 'n/a';
  }

  const formatted = value.toFixed(fractionDigits);
  return formatted.includes('.') ? formatted.replace(/\.?0+$/, '') : formatted;
}

function renderMarkdownTable(columns, rows) {
  if (rows.length === 0) {
    return '_No data._';
  }

  const header = `| ${columns.map((column) => column.label).join(' | ')} |`;
  const divider = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${columns.map((column) => row[column.key]).join(' | ')} |`);
  return [header, divider, ...body].join('\n');
}

function buildOutcomeRows(summaryRows) {
  return summaryRows.map((row) => ({
    queryCaseId: row.queryCaseId,
    transportId: row.transportId,
    persistedRuns: String(row.runCount),
    successRate: `${row.successCount}/${row.runCount}`,
    errors: String(row.errorCount),
    cancelled: String(row.cancelledCount),
  }));
}

function buildPerformanceRows(summaryRows) {
  return summaryRows.map((row) => ({
    queryCaseId: row.queryCaseId,
    transportId: row.transportId,
    connectMs: formatMetric(row.medianConnectionSetupMs),
    ttfbMs: formatMetric(row.medianTtfbMs),
    totalMs: formatMetric(row.medianTotalTimeMs),
    rowsPerSec: formatMetric(row.medianThroughputRowsPerSec),
    mbPerSec: formatMetric(row.medianThroughputMBPerSec),
  }));
}

function buildExceptionRows(records) {
  return records
    .filter((record) => record.result !== 'success')
    .toSorted((left, right) => {
      return (
        left.queryCaseId.localeCompare(right.queryCaseId) ||
        left.transportId.localeCompare(right.transportId) ||
        left.repetition - right.repetition
      );
    })
    .map((record) => ({
      queryCaseId: record.queryCaseId,
      transportId: record.transportId,
      repetition: String(record.repetition),
      result: record.result,
      details: record.errorMessage ?? 'No error message recorded.',
    }));
}

function countByResult(records, result) {
  return records.filter((record) => record.result === result).length;
}

export function buildReportMarkdown({ manifest, records, summaryRows }) {
  const outcomeRows = buildOutcomeRows(summaryRows);
  const performanceRows = buildPerformanceRows(summaryRows);
  const exceptionRows = buildExceptionRows(records);

  const lines = [
    '# Benchmark Session Report',
    '',
    '## Session',
    '',
    `- Created: ${manifest.createdAt}`,
    `- Mode: ${manifest.mode}`,
    `- Network profile: ${manifest.networkProfile ?? 'default'}`,
    `- Browser: ${manifest.browser.name} ${manifest.browser.version}`,
    `- Warmup runs per case: ${manifest.warmupRuns}`,
    `- Persisted repetitions per case: ${manifest.repetitions}`,
    `- Persisted runs: ${records.length}/${manifest.totalPlannedRuns}`,
    `- Successes: ${countByResult(records, 'success')}`,
    `- Errors: ${countByResult(records, 'error')}`,
    `- Cancelled: ${countByResult(records, 'cancelled')}`,
    `- Git SHA: ${manifest.gitSha ?? 'unavailable'}`,
    `- Raw results: \`${manifest.resultsFile}\``,
  ];

  if (manifest.derivedFiles) {
    lines.push(
      `- Runs CSV: \`${manifest.derivedFiles.runsCsv}\``,
      `- Summary CSV: \`${manifest.derivedFiles.summaryCsv}\``,
      `- Report: \`${manifest.derivedFiles.reportMarkdown}\``,
    );
  }

  lines.push(
    '',
    '## Outcome Summary',
    '',
    renderMarkdownTable(
      [
        { key: 'queryCaseId', label: 'Query case' },
        { key: 'transportId', label: 'Transport' },
        { key: 'persistedRuns', label: 'Persisted runs' },
        { key: 'successRate', label: 'Successes' },
        { key: 'errors', label: 'Errors' },
        { key: 'cancelled', label: 'Cancelled' },
      ],
      outcomeRows,
    ),
    '',
    '## Median Metrics',
    '',
    renderMarkdownTable(
      [
        { key: 'queryCaseId', label: 'Query case' },
        { key: 'transportId', label: 'Transport' },
        { key: 'connectMs', label: 'Connect (ms)' },
        { key: 'ttfbMs', label: 'TTFB (ms)' },
        { key: 'totalMs', label: 'Total (ms)' },
        { key: 'rowsPerSec', label: 'Rows/sec' },
        { key: 'mbPerSec', label: 'MB/sec' },
      ],
      performanceRows,
    ),
    '',
    '## Exceptions',
    '',
  );

  if (exceptionRows.length === 0) {
    lines.push('No failed or cancelled persisted runs.');
  } else {
    lines.push(
      renderMarkdownTable(
        [
          { key: 'queryCaseId', label: 'Query case' },
          { key: 'transportId', label: 'Transport' },
          { key: 'repetition', label: 'Repetition' },
          { key: 'result', label: 'Result' },
          { key: 'details', label: 'Details' },
        ],
        exceptionRows,
      ),
    );
  }

  lines.push(
    '',
    '## Caveats',
    '',
    '- Warmup runs are excluded from all derived session artifacts.',
    '- Metrics come from the browser-side `QueryStats` payload already used by the UI.',
    '- `mode` and `networkProfile` are recorded labels; the runner does not validate that the external environment matched them.',
  );

  return `${lines.join('\n')}\n`;
}

export function buildSessionArtifacts({ manifest, records }) {
  const runRows = records.map(flattenRunRecord);
  const summaryRows = buildSummaryRows(records);

  return {
    runRows,
    summaryRows,
    runsCsv: serializeCsv(runRows, RUNS_CSV_COLUMNS),
    summaryCsv: serializeCsv(summaryRows, SUMMARY_CSV_COLUMNS),
    reportMarkdown: buildReportMarkdown({ manifest, records, summaryRows }),
  };
}

function resolveDerivedFilePath(repoRoot, sessionDir, relativePath, fallbackName) {
  if (relativePath) {
    return path.resolve(repoRoot, relativePath);
  }

  return path.join(sessionDir, fallbackName);
}

export async function writeSessionAnalysis({ repoRoot, sessionDir, manifest }) {
  const resultsPath = path.resolve(repoRoot, manifest.resultsFile);
  const records = parseNdjson(await fs.readFile(resultsPath, 'utf8'));
  const artifacts = buildSessionArtifacts({ manifest, records });

  const runsCsvPath = resolveDerivedFilePath(repoRoot, sessionDir, manifest.derivedFiles?.runsCsv, 'runs.csv');
  const summaryCsvPath = resolveDerivedFilePath(repoRoot, sessionDir, manifest.derivedFiles?.summaryCsv, 'summary.csv');
  const reportPath = resolveDerivedFilePath(repoRoot, sessionDir, manifest.derivedFiles?.reportMarkdown, 'report.md');

  await Promise.all([
    fs.writeFile(runsCsvPath, artifacts.runsCsv, 'utf8'),
    fs.writeFile(summaryCsvPath, artifacts.summaryCsv, 'utf8'),
    fs.writeFile(reportPath, artifacts.reportMarkdown, 'utf8'),
  ]);

  return {
    recordCount: records.length,
    summaryRowCount: artifacts.summaryRows.length,
    runsCsvPath,
    summaryCsvPath,
    reportPath,
  };
}
