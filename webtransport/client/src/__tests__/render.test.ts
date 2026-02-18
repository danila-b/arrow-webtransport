import { type Schema, makeTable, tableFromIPC, tableToIPC } from 'apache-arrow';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  appendBatchRows,
  createAppLayout,
  hideProgressBar,
  initStreamingTable,
  renderArrowTable,
  renderStats,
  resetStatsPanel,
  setStatus,
  showProgressBar,
  showStatsPanel,
  updateProgress,
  updateRowCount,
} from '../render.ts';
import type { QueryStats } from '../stats.ts';

function makeTestTable(rowCount: number) {
  const ids = Int32Array.from({ length: rowCount }, (_, i) => i + 1);
  const values = Float64Array.from({ length: rowCount }, (_, i) => i * 1.5);
  const ipc = tableToIPC(makeTable({ id: ids, value: values }), 'stream');
  return tableFromIPC(ipc);
}

function makeTestSchema(): Schema {
  return makeTestTable(1).schema;
}

describe('createAppLayout', () => {
  let root: HTMLDivElement;

  beforeEach(() => {
    root = document.createElement('div');
  });

  it('creates all expected elements', () => {
    const els = createAppLayout(root);

    expect(els.queryInput).toBeInstanceOf(HTMLTextAreaElement);
    expect(els.runButton).toBeInstanceOf(HTMLButtonElement);
    expect(els.cancelButton).toBeInstanceOf(HTMLButtonElement);
    expect(els.statusEl).toBeDefined();
    expect(els.progressContainer).toBeDefined();
    expect(els.progressLabel).toBeDefined();
    expect(els.statsContainer).toBeDefined();
    expect(els.tableContainer).toBeDefined();
  });

  it('attaches elements to root', () => {
    createAppLayout(root);

    expect(root.querySelector('textarea')).not.toBeNull();
    expect(root.querySelector('.btn-run')).not.toBeNull();
    expect(root.querySelector('.btn-cancel')).not.toBeNull();
    expect(root.querySelector('.progress-bar')).not.toBeNull();
    expect(root.querySelector('.status')).not.toBeNull();
    expect(root.querySelector('.stats-panel')).not.toBeNull();
    expect(root.querySelector('.table-container')).not.toBeNull();
  });

  it('cancel button is hidden by default', () => {
    const els = createAppLayout(root);
    expect(els.cancelButton.hidden).toBe(true);
  });

  it('progress bar is hidden by default', () => {
    const els = createAppLayout(root);
    expect(els.progressContainer.hidden).toBe(true);
  });

  it('stats panel is hidden by default', () => {
    const els = createAppLayout(root);
    expect(els.statsContainer.hidden).toBe(true);
  });

  it('sets default query value', () => {
    const els = createAppLayout(root);
    expect(els.queryInput.value).toBe('SELECT * FROM yellow_taxi LIMIT 1000');
  });
});

describe('renderArrowTable', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('renders correct column headers', () => {
    const table = makeTestTable(3);
    renderArrowTable(table, container);

    const headers = container.querySelectorAll('th');
    expect(headers).toHaveLength(2);
    expect(headers[0].textContent).toBe('id');
    expect(headers[1].textContent).toBe('value');
  });

  it('renders correct number of rows', () => {
    const table = makeTestTable(5);
    renderArrowTable(table, container);

    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(5);
  });

  it('renders cell values correctly', () => {
    const table = makeTestTable(2);
    renderArrowTable(table, container);

    const cells = container.querySelectorAll('tbody tr:first-child td');
    expect(cells[0].textContent).toBe('1');
    expect(cells[1].textContent).toBe('0');
  });

  it('respects maxRows limit', () => {
    const table = makeTestTable(10);
    renderArrowTable(table, container, 3);

    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(3);
  });

  it('shows truncation message when rows exceed maxRows', () => {
    const table = makeTestTable(10);
    renderArrowTable(table, container, 3);

    const rowCount = container.querySelector('.row-count');
    expect(rowCount?.textContent).toBe('Showing 3 of 10 rows');
  });

  it('shows total count when all rows displayed', () => {
    const table = makeTestTable(3);
    renderArrowTable(table, container);

    const rowCount = container.querySelector('.row-count');
    expect(rowCount?.textContent).toBe('3 rows');
  });
});

describe('initStreamingTable', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('creates table with correct column headers', () => {
    const schema = makeTestSchema();
    initStreamingTable(container, schema);

    const headers = container.querySelectorAll('th');
    expect(headers).toHaveLength(2);
    expect(headers[0].textContent).toBe('id');
    expect(headers[1].textContent).toBe('value');
  });

  it('creates an empty tbody', () => {
    const schema = makeTestSchema();
    initStreamingTable(container, schema);

    const tbody = container.querySelector('tbody');
    expect(tbody).not.toBeNull();
    expect(tbody?.children).toHaveLength(0);
  });

  it('creates a row-count element with initial text', () => {
    const schema = makeTestSchema();
    initStreamingTable(container, schema);

    const rowCount = container.querySelector('.row-count');
    expect(rowCount).not.toBeNull();
    expect(rowCount?.textContent).toBe('0 rows');
  });

  it('returns tbody and rowCountEl references', () => {
    const schema = makeTestSchema();
    const { tbody, rowCountEl } = initStreamingTable(container, schema);

    expect(tbody).toBe(container.querySelector('tbody'));
    expect(rowCountEl).toBe(container.querySelector('.row-count'));
  });

  it('clears existing container content', () => {
    container.innerHTML = '<p>old content</p>';
    const schema = makeTestSchema();
    initStreamingTable(container, schema);

    expect(container.querySelector('p.old')).toBeNull();
    expect(container.querySelector('table')).not.toBeNull();
  });
});

describe('appendBatchRows', () => {
  let tbody: HTMLTableSectionElement;

  beforeEach(() => {
    tbody = document.createElement('tbody');
  });

  it('appends rows from a record batch', () => {
    const table = makeTestTable(3);
    const batch = table.batches[0];
    const columnNames = table.schema.fields.map((f) => f.name);

    appendBatchRows(tbody, batch, columnNames);

    expect(tbody.querySelectorAll('tr')).toHaveLength(3);
  });

  it('renders correct cell values', () => {
    const table = makeTestTable(2);
    const batch = table.batches[0];
    const columnNames = table.schema.fields.map((f) => f.name);

    appendBatchRows(tbody, batch, columnNames);

    const firstRowCells = tbody.querySelectorAll('tr:first-child td');
    expect(firstRowCells[0].textContent).toBe('1');
    expect(firstRowCells[1].textContent).toBe('0');
  });

  it('accumulates rows across multiple calls', () => {
    const table = makeTestTable(3);
    const batch = table.batches[0];
    const columnNames = table.schema.fields.map((f) => f.name);

    appendBatchRows(tbody, batch, columnNames);
    appendBatchRows(tbody, batch, columnNames);

    expect(tbody.querySelectorAll('tr')).toHaveLength(6);
  });

  it('respects endRow parameter', () => {
    const table = makeTestTable(5);
    const batch = table.batches[0];
    const columnNames = table.schema.fields.map((f) => f.name);

    appendBatchRows(tbody, batch, columnNames, 0, 2);

    expect(tbody.querySelectorAll('tr')).toHaveLength(2);
  });

  it('supports startRow and endRow together', () => {
    const table = makeTestTable(10);
    const batch = table.batches[0];
    const columnNames = table.schema.fields.map((f) => f.name);

    appendBatchRows(tbody, batch, columnNames, 3, 7);

    expect(tbody.querySelectorAll('tr')).toHaveLength(4);
    const firstCell = tbody.querySelector('tr:first-child td');
    expect(firstCell?.textContent).toBe('4');
  });

  it('clamps endRow to batch size', () => {
    const table = makeTestTable(3);
    const batch = table.batches[0];
    const columnNames = table.schema.fields.map((f) => f.name);

    appendBatchRows(tbody, batch, columnNames, 0, 100);

    expect(tbody.querySelectorAll('tr')).toHaveLength(3);
  });
});

describe('updateRowCount', () => {
  it('sets text content with the count', () => {
    const el = document.createElement('p');
    updateRowCount(el, 42);
    expect(el.textContent).toBe('42 rows');
  });

  it('updates on subsequent calls', () => {
    const el = document.createElement('p');
    updateRowCount(el, 5);
    expect(el.textContent).toBe('5 rows');
    updateRowCount(el, 10);
    expect(el.textContent).toBe('10 rows');
  });

  it('shows displayed vs total when total exceeds displayed', () => {
    const el = document.createElement('p');
    updateRowCount(el, 1000, 5000);
    expect(el.textContent).toBe('Showing 1000 of 5000 rows');
  });

  it('shows simple count when total equals displayed', () => {
    const el = document.createElement('p');
    updateRowCount(el, 500, 500);
    expect(el.textContent).toBe('500 rows');
  });
});

describe('showProgressBar / hideProgressBar', () => {
  it('toggles hidden attribute', () => {
    const el = document.createElement('div');
    el.hidden = true;

    showProgressBar(el);
    expect(el.hidden).toBe(false);

    hideProgressBar(el);
    expect(el.hidden).toBe(true);
  });
});

describe('updateProgress', () => {
  it('shows row and batch counts', () => {
    const el = document.createElement('span');
    updateProgress(el, 500, 3);
    expect(el.textContent).toBe('500 rows, 3 batches');
  });

  it('uses singular "batch" for count of 1', () => {
    const el = document.createElement('span');
    updateProgress(el, 100, 1);
    expect(el.textContent).toBe('100 rows, 1 batch');
  });
});

describe('setStatus', () => {
  let el: HTMLDivElement;

  beforeEach(() => {
    el = document.createElement('div');
  });

  it('sets text content', () => {
    setStatus(el, 'Loading...');
    expect(el.textContent).toBe('Loading...');
  });

  it('applies info class by default', () => {
    setStatus(el, 'Working');
    expect(el.className).toBe('status status--info');
  });

  it('applies error class', () => {
    setStatus(el, 'Failed', 'error');
    expect(el.className).toBe('status status--error');
  });

  it('applies success class', () => {
    setStatus(el, 'Done', 'success');
    expect(el.className).toBe('status status--success');
  });
});

describe('showStatsPanel / resetStatsPanel', () => {
  it('showStatsPanel unhides the container', () => {
    const el = document.createElement('div');
    el.hidden = true;
    showStatsPanel(el);
    expect(el.hidden).toBe(false);
  });

  it('resetStatsPanel clears innerHTML', () => {
    const el = document.createElement('div');
    el.innerHTML = '<span>old</span>';
    resetStatsPanel(el);
    expect(el.innerHTML).toBe('');
  });
});

function makeFullStats(overrides: Partial<QueryStats> = {}): QueryStats {
  return {
    connectionSetupMs: 42,
    ttfbMs: 18,
    totalTimeMs: 1200,
    totalRows: 10000,
    totalBytes: 5_000_000,
    connectionRestarts: 0,
    throughputRowsPerSec: 8333,
    throughputMBPerSec: 4.17,
    cancelLatencyMs: null,
    longTaskCount: 0,
    longTaskTotalMs: 0,
    ...overrides,
  };
}

describe('renderStats', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('renders all stat rows as label/value pairs', () => {
    renderStats(container, makeFullStats());

    const labels = container.querySelectorAll('.stats-panel__label');
    const values = container.querySelectorAll('.stats-panel__value');
    expect(labels.length).toBe(7);
    expect(values.length).toBe(7);
  });

  it('shows connection setup time', () => {
    renderStats(container, makeFullStats({ connectionSetupMs: 42 }));

    const values = container.querySelectorAll('.stats-panel__value');
    expect(values[0].textContent).toBe('42ms');
  });

  it('shows TTFB when available', () => {
    renderStats(container, makeFullStats({ ttfbMs: 18 }));

    const values = container.querySelectorAll('.stats-panel__value');
    expect(values[1].textContent).toBe('18ms');
  });

  it('shows dash for null TTFB', () => {
    renderStats(container, makeFullStats({ ttfbMs: null }));

    const values = container.querySelectorAll('.stats-panel__value');
    expect(values[1].textContent).toBe('\u2014');
  });

  it('shows total time', () => {
    renderStats(container, makeFullStats({ totalTimeMs: 1200 }));

    const values = container.querySelectorAll('.stats-panel__value');
    expect(values[2].textContent).toBe('1.20s');
  });

  it('shows connection restarts count', () => {
    renderStats(container, makeFullStats({ connectionRestarts: 2 }));

    const values = container.querySelectorAll('.stats-panel__value');
    expect(values[3].textContent).toBe('2');
  });

  it('shows throughput when available', () => {
    renderStats(container, makeFullStats({ throughputRowsPerSec: 5000, throughputMBPerSec: 2.5 }));

    const values = container.querySelectorAll('.stats-panel__value');
    expect(values[4].textContent).toContain('rows/sec');
    expect(values[4].textContent).toContain('MB/sec');
  });

  it('shows dash for null throughput', () => {
    renderStats(container, makeFullStats({ throughputRowsPerSec: null, throughputMBPerSec: null }));

    const values = container.querySelectorAll('.stats-panel__value');
    expect(values[4].textContent).toBe('\u2014');
  });

  it('shows cancellation latency when present', () => {
    renderStats(container, makeFullStats({ cancelLatencyMs: 23 }));

    const values = container.querySelectorAll('.stats-panel__value');
    expect(values[5].textContent).toBe('23ms');
  });

  it('shows N/A for null cancellation latency', () => {
    renderStats(container, makeFullStats({ cancelLatencyMs: null }));

    const values = container.querySelectorAll('.stats-panel__value');
    expect(values[5].textContent).toBe('N/A');
  });

  it('shows long task info when present', () => {
    renderStats(container, makeFullStats({ longTaskCount: 3, longTaskTotalMs: 180 }));

    const values = container.querySelectorAll('.stats-panel__value');
    expect(values[6].textContent).toBe('3 (180ms total blocked)');
  });

  it('shows None for zero long tasks', () => {
    renderStats(container, makeFullStats({ longTaskCount: 0, longTaskTotalMs: 0 }));

    const values = container.querySelectorAll('.stats-panel__value');
    expect(values[6].textContent).toBe('None');
  });

  it('clears previous content on re-render', () => {
    renderStats(container, makeFullStats());
    renderStats(container, makeFullStats());

    const labels = container.querySelectorAll('.stats-panel__label');
    expect(labels.length).toBe(7);
  });
});
