import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(clientDir, '..', '..');
const defaultBaseUrl = 'https://localhost:5173';
const defaultRunTimeoutMs = 300_000;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const configArg = argv[2];
  if (!configArg) {
    fail(
      'Usage: npm run bench:run -- <config-path>\nExample: npm run bench:run -- benchmarks/minimal.example.json',
    );
  }

  return {
    configPath: path.resolve(process.cwd(), configArg),
  };
}

async function loadConfig(configPath) {
  const contents = await fs.readFile(configPath, 'utf8');
  const config = JSON.parse(contents);

  if (!Array.isArray(config.transports) || config.transports.length === 0) {
    fail('Config must define a non-empty "transports" array.');
  }

  if (!Array.isArray(config.workloads)) {
    fail('Config must define a "workloads" array (empty is allowed if using only customQueries).');
  }

  if (!Array.isArray(config.customQueries ?? [])) {
    fail('Config field "customQueries" must be an array when provided.');
  }

  if (config.workloads.length === 0 && (config.customQueries?.length ?? 0) === 0) {
    fail('Config must define at least one preset workload or one custom query.');
  }

  return config;
}

function getGitSha() {
  try {
    return execSync('git rev-parse HEAD', { cwd: repoRoot, encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function makeTimestampSlug() {
  return new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
}

function buildQueryCases(config) {
  const presetCases = config.workloads.map((workloadId) => ({
    kind: 'preset',
    id: workloadId,
  }));

  const customCases = (config.customQueries ?? []).map((query) => ({
    kind: 'custom',
    id: query.id,
    sql: query.sql,
  }));

  return [...presetCases, ...customCases];
}

function sanitizeFileName(value) {
  return value.replaceAll(/[^a-zA-Z0-9-_]/g, '-');
}

function createRunRecord({
  browserVersion,
  config,
  gitSha,
  queryCase,
  queryText,
  repetition,
  transportId,
  result,
  errorMessage,
  stats,
}) {
  const workloadId = queryCase.kind === 'preset' ? queryCase.id : 'custom';

  return {
    schemaVersion: 1,
    runId: randomUUID(),
    recordedAt: new Date().toISOString(),
    gitSha,
    mode: config.mode ?? 'dev',
    networkProfile: config.networkProfile ?? null,
    baseUrl: config.baseUrl ?? defaultBaseUrl,
    browser: {
      name: 'chromium',
      version: browserVersion,
    },
    repetition,
    transportId,
    workloadId,
    queryCaseId: queryCase.id,
    querySource: workloadId,
    queryText,
    result,
    errorMessage,
    stats,
  };
}

async function appendNdjsonRecord(filePath, record) {
  await fs.appendFile(filePath, `${JSON.stringify(record)}\n`, 'utf8');
}

async function waitForBenchBridge(page) {
  await page.waitForFunction(() => window.__bench?.version === 1);
}

async function prepareQuery(page, queryCase) {
  if (queryCase.kind === 'preset') {
    await page.selectOption('.workload-picker', queryCase.id);
  } else {
    await page.selectOption('.workload-picker', 'custom');
    await page.fill('.query-input', queryCase.sql);
  }

  return page.locator('.query-input').inputValue();
}

async function executeClientRun(page, { transportId, queryCase, runTimeoutMs, baseUrl }) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await waitForBenchBridge(page);

  await page.check(`input[name="transport"][value="${transportId}"]`);
  const queryText = await prepareQuery(page, queryCase);

  const previousRunId = await page.evaluate(() => window.__bench?.lastRun.runId ?? 0);
  await page.click('.btn-run');

  const startHandle = await page.waitForFunction(
    (priorRunId) => {
      const state = window.__bench?.lastRun;
      return state && state.runId > priorRunId && state.status === 'running' ? state.runId : null;
    },
    previousRunId,
    { timeout: runTimeoutMs },
  );

  const startedRunId = await startHandle.jsonValue();
  const completionHandle = await page.waitForFunction(
    (targetRunId) => {
      const state = window.__bench?.lastRun;
      if (!state || state.runId !== targetRunId || state.status === 'running') {
        return null;
      }

      return state;
    },
    startedRunId,
    { timeout: runTimeoutMs },
  );

  const state = await completionHandle.jsonValue();
  return {
    queryText,
    state,
  };
}

async function runSingleCase(page, browserVersion, config, gitSha, queryCase, transportId, repetition) {
  const baseUrl = config.baseUrl ?? defaultBaseUrl;
  const runTimeoutMs = config.runTimeoutMs ?? defaultRunTimeoutMs;

  try {
    const { queryText, state } = await executeClientRun(page, {
      transportId,
      queryCase,
      runTimeoutMs,
      baseUrl,
    });

    return createRunRecord({
      browserVersion,
      config,
      gitSha,
      queryCase,
      queryText,
      repetition,
      transportId,
      result: state.status,
      errorMessage: state.errorMessage,
      stats: state.stats,
    });
  } catch (error) {
    return createRunRecord({
      browserVersion,
      config,
      gitSha,
      queryCase,
      queryText: queryCase.kind === 'custom' ? queryCase.sql : null,
      repetition,
      transportId,
      result: 'error',
      errorMessage: error instanceof Error ? error.message : String(error),
      stats: null,
    });
  }
}

async function main() {
  const { configPath } = parseArgs(process.argv);
  const config = await loadConfig(configPath);
  const queryCases = buildQueryCases(config);
  const timestampSlug = makeTimestampSlug();
  const outputRoot = path.resolve(repoRoot, config.outputDir ?? 'results');
  const sessionDir = path.join(outputRoot, timestampSlug);
  const ndjsonName = `${sanitizeFileName(config.networkProfile ?? 'default')}.ndjson`;
  const ndjsonPath = path.join(sessionDir, ndjsonName);
  const warmupRuns = Number(config.warmupRuns ?? 0);
  const repetitions = Number(config.repetitions ?? 1);
  const gitSha = getGitSha();

  if (!Number.isInteger(repetitions) || repetitions <= 0) {
    fail('Config field "repetitions" must be a positive integer.');
  }

  if (!Number.isInteger(warmupRuns) || warmupRuns < 0) {
    fail('Config field "warmupRuns" must be a non-negative integer.');
  }

  await fs.mkdir(sessionDir, { recursive: true });

  const browser = await chromium.launch({
    headless: config.headless ?? true,
  });
  const browserVersion = browser.version();
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  const manifest = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    configPath,
    gitSha,
    mode: config.mode ?? 'dev',
    networkProfile: config.networkProfile ?? null,
    baseUrl: config.baseUrl ?? defaultBaseUrl,
    browser: {
      name: 'chromium',
      version: browserVersion,
    },
    warmupRuns,
    repetitions,
    transports: config.transports,
    workloads: config.workloads,
    customQueries: config.customQueries ?? [],
    resultsFile: path.relative(repoRoot, ndjsonPath),
    totalPlannedRuns: config.transports.length * queryCases.length * repetitions,
    notes: [
      'This runner persists raw browser-side results only.',
      'Server startup and network-profile orchestration remain external prerequisites in v1.',
    ],
  };

  await fs.writeFile(path.join(sessionDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  for (const transportId of config.transports) {
    for (const queryCase of queryCases) {
      for (let warmupIndex = 1; warmupIndex <= warmupRuns; warmupIndex += 1) {
        console.log(`Warmup ${warmupIndex}/${warmupRuns}: ${transportId} x ${queryCase.id}`);
        await runSingleCase(page, browserVersion, config, gitSha, queryCase, transportId, 0);
      }

      for (let repetition = 1; repetition <= repetitions; repetition += 1) {
        console.log(`Run ${transportId} x ${queryCase.id} x repetition ${repetition}/${repetitions}`);
        const record = await runSingleCase(page, browserVersion, config, gitSha, queryCase, transportId, repetition);
        await appendNdjsonRecord(ndjsonPath, record);
      }
    }
  }

  await context.close();
  await browser.close();

  console.log(`Wrote raw results to ${path.relative(repoRoot, ndjsonPath)}`);
}

await main();
