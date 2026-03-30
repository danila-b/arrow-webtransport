import type { RecordBatch, Schema, Table } from 'apache-arrow';
import type { QueryStats } from './stats.ts';
import { CUSTOM_WORKLOAD_ID, WORKLOADS } from './workloads.ts';

export type TransportId = 'webtransport' | 'http2-arrow' | 'http2-json';

export interface AppElements {
  transportPicker: HTMLFieldSetElement;
  workloadPicker: HTMLSelectElement;
  queryInput: HTMLTextAreaElement;
  runButton: HTMLButtonElement;
  cancelButton: HTMLButtonElement;
  statusEl: HTMLElement;
  progressContainer: HTMLElement;
  progressLabel: HTMLElement;
  statsContainer: HTMLElement;
  tableContainer: HTMLElement;
}

const TRANSPORT_OPTIONS: { id: TransportId; label: string }[] = [
  { id: 'webtransport', label: 'WebTransport (QUIC)' },
  { id: 'http2-arrow', label: 'HTTP/2 Arrow IPC' },
  { id: 'http2-json', label: 'HTTP/2 JSON' },
];

export function createAppLayout(root: HTMLElement): AppElements {
  root.innerHTML = '';
  root.classList.add('app-layout');

  const heading = document.createElement('h1');
  heading.textContent = 'Arrow Streaming';

  const transportPicker = document.createElement('fieldset');
  transportPicker.className = 'transport-picker';
  const legend = document.createElement('legend');
  legend.textContent = 'Transport';
  transportPicker.appendChild(legend);

  for (const opt of TRANSPORT_OPTIONS) {
    const label = document.createElement('label');
    label.className = 'transport-picker__option';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'transport';
    radio.value = opt.id;
    if (opt.id === 'webtransport') radio.checked = true;
    label.append(radio, ` ${opt.label}`);
    transportPicker.appendChild(label);
  }

  const workloadPicker = document.createElement('select');
  workloadPicker.className = 'workload-picker';

  const customOption = document.createElement('option');
  customOption.value = CUSTOM_WORKLOAD_ID;
  customOption.textContent = 'Custom query';
  workloadPicker.appendChild(customOption);

  for (const w of WORKLOADS) {
    const option = document.createElement('option');
    option.value = w.id;
    option.textContent = w.name;
    option.title = w.description;
    workloadPicker.appendChild(option);
  }

  const queryInput = document.createElement('textarea');
  queryInput.className = 'query-input';
  queryInput.placeholder = 'Enter query...';
  queryInput.value = 'SELECT * FROM yellow_taxi LIMIT 1000';
  queryInput.rows = 3;

  const buttonRow = document.createElement('div');
  buttonRow.className = 'button-row';

  const runButton = document.createElement('button');
  runButton.className = 'btn-run';
  runButton.textContent = 'Run';

  const cancelButton = document.createElement('button');
  cancelButton.className = 'btn-cancel';
  cancelButton.textContent = 'Cancel';
  cancelButton.hidden = true;

  buttonRow.append(runButton, cancelButton);

  const progressContainer = document.createElement('div');
  progressContainer.className = 'progress-bar';
  progressContainer.hidden = true;

  const progressFill = document.createElement('div');
  progressFill.className = 'progress-bar__fill';

  const progressLabel = document.createElement('span');
  progressLabel.className = 'progress-bar__label';

  progressContainer.append(progressFill, progressLabel);

  const statusEl = document.createElement('div');
  statusEl.className = 'status';

  const statsContainer = document.createElement('div');
  statsContainer.className = 'stats-panel';
  statsContainer.hidden = true;

  const tableContainer = document.createElement('div');
  tableContainer.className = 'table-container';

  root.append(
    heading,
    transportPicker,
    workloadPicker,
    queryInput,
    buttonRow,
    progressContainer,
    statusEl,
    statsContainer,
    tableContainer,
  );

  return {
    transportPicker,
    workloadPicker,
    queryInput,
    runButton,
    cancelButton,
    statusEl,
    progressContainer,
    progressLabel,
    statsContainer,
    tableContainer,
  };
}

export function getSelectedTransport(picker: HTMLFieldSetElement): TransportId {
  const checked = picker.querySelector<HTMLInputElement>('input[name="transport"]:checked');
  return (checked?.value as TransportId) ?? 'webtransport';
}

export function getSelectedWorkload(picker: HTMLSelectElement): string {
  return picker.value;
}

const DEFAULT_MAX_ROWS = 100;

export function renderArrowTable(table: Table, container: HTMLElement, maxRows = DEFAULT_MAX_ROWS): void {
  container.innerHTML = '';

  const schema = table.schema;
  const columnNames = schema.fields.map((f) => f.name);
  const displayRows = Math.min(table.numRows, maxRows);

  const tableEl = document.createElement('table');
  tableEl.className = 'arrow-table';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  for (const name of columnNames) {
    const th = document.createElement('th');
    th.textContent = name;
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  tableEl.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (let i = 0; i < displayRows; i++) {
    const tr = document.createElement('tr');
    for (const name of columnNames) {
      const td = document.createElement('td');
      const value = table.getChild(name)?.get(i);
      td.textContent = value == null ? '' : String(value);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  tableEl.appendChild(tbody);

  container.appendChild(tableEl);

  const rowCount = document.createElement('p');
  rowCount.className = 'row-count';
  if (table.numRows > maxRows) {
    rowCount.textContent = `Showing ${displayRows} of ${table.numRows} rows`;
  } else {
    rowCount.textContent = `${table.numRows} rows`;
  }
  container.appendChild(rowCount);
}

export interface StreamingTableElements {
  tbody: HTMLTableSectionElement;
  rowCountEl: HTMLElement;
}

export function initStreamingTable(container: HTMLElement, schema: Schema): StreamingTableElements {
  container.innerHTML = '';

  const columnNames = schema.fields.map((f) => f.name);

  const tableEl = document.createElement('table');
  tableEl.className = 'arrow-table';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  for (const name of columnNames) {
    const th = document.createElement('th');
    th.textContent = name;
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  tableEl.appendChild(thead);

  const tbody = document.createElement('tbody');
  tableEl.appendChild(tbody);

  container.appendChild(tableEl);

  const rowCountEl = document.createElement('p');
  rowCountEl.className = 'row-count';
  rowCountEl.textContent = '0 rows';
  container.appendChild(rowCountEl);

  return { tbody, rowCountEl };
}

export function appendBatchRows(
  tbody: HTMLTableSectionElement,
  batch: RecordBatch,
  columnNames: string[],
  startRow = 0,
  endRow?: number,
): void {
  const end = endRow != null ? Math.min(endRow, batch.numRows) : batch.numRows;
  for (let i = startRow; i < end; i++) {
    const tr = document.createElement('tr');
    for (const name of columnNames) {
      const td = document.createElement('td');
      const value = batch.getChild(name)?.get(i);
      td.textContent = value == null ? '' : String(value);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
}

export function updateRowCount(el: HTMLElement, displayed: number, total?: number): void {
  if (total != null && total > displayed) {
    el.textContent = `Showing ${displayed} of ${total} rows`;
  } else {
    el.textContent = `${displayed} rows`;
  }
}

export function showProgressBar(container: HTMLElement): void {
  container.hidden = false;
}

export function hideProgressBar(container: HTMLElement): void {
  container.hidden = true;
}

export function updateProgress(label: HTMLElement, rows: number, batches: number): void {
  label.textContent = `${rows.toLocaleString()} rows, ${batches} ${batches === 1 ? 'batch' : 'batches'}`;
}

type StatusKind = 'info' | 'error' | 'success';

export function setStatus(el: HTMLElement, message: string, kind: StatusKind = 'info'): void {
  el.textContent = message;
  el.className = `status status--${kind}`;
}

export function showStatsPanel(container: HTMLElement): void {
  container.hidden = false;
}

export function resetStatsPanel(container: HTMLElement): void {
  container.innerHTML = '';
}

function formatMs(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
}

function addStatRow(container: HTMLElement, label: string, value: string): void {
  const labelEl = document.createElement('span');
  labelEl.className = 'stats-panel__label';
  labelEl.textContent = label;

  const valueEl = document.createElement('span');
  valueEl.className = 'stats-panel__value';
  valueEl.textContent = value;

  container.append(labelEl, valueEl);
}

export function renderStats(container: HTMLElement, stats: QueryStats): void {
  container.innerHTML = '';

  if (stats.workloadId) {
    addStatRow(container, 'Workload', stats.workloadId);
  }
  if (stats.transportId) {
    addStatRow(container, 'Transport', stats.transportId);
  }

  addStatRow(container, 'Connection setup', formatMs(stats.connectionSetupMs));

  addStatRow(container, 'Time to first byte', stats.ttfbMs !== null ? formatMs(stats.ttfbMs) : '\u2014');

  addStatRow(container, 'Total time', formatMs(stats.totalTimeMs));

  addStatRow(container, 'Connection restarts', String(stats.connectionRestarts));

  if (stats.throughputRowsPerSec !== null && stats.throughputMBPerSec !== null) {
    const rowsPerSec = Math.round(stats.throughputRowsPerSec).toLocaleString();
    const mbPerSec = stats.throughputMBPerSec.toFixed(2);
    addStatRow(container, 'Throughput', `${rowsPerSec} rows/sec (${mbPerSec} MB/sec)`);
  } else {
    addStatRow(container, 'Throughput', '\u2014');
  }

  addStatRow(
    container,
    'Cancellation latency',
    stats.cancelLatencyMs !== null ? formatMs(stats.cancelLatencyMs) : 'N/A',
  );

  if (stats.longTaskCount > 0) {
    addStatRow(
      container,
      'Long tasks',
      `${stats.longTaskCount} (${Math.round(stats.longTaskTotalMs)}ms total blocked)`,
    );
  } else {
    addStatRow(container, 'Long tasks', 'None');
  }
}
