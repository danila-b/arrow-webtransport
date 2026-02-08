import { type Schema, makeTable, tableFromIPC, tableToIPC } from 'apache-arrow';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  appendBatchRows,
  createAppLayout,
  initStreamingTable,
  renderArrowTable,
  setStatus,
  updateRowCount,
} from '../render.ts';

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
    expect(els.statusEl).toBeDefined();
    expect(els.tableContainer).toBeDefined();
  });

  it('attaches elements to root', () => {
    createAppLayout(root);

    expect(root.querySelector('textarea')).not.toBeNull();
    expect(root.querySelector('button')).not.toBeNull();
    expect(root.querySelector('.status')).not.toBeNull();
    expect(root.querySelector('.table-container')).not.toBeNull();
  });

  it('sets default query value', () => {
    const els = createAppLayout(root);
    expect(els.queryInput.value).toBe('get_arrow_data');
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
