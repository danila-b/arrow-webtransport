import type { Table } from 'apache-arrow';

export interface AppElements {
  queryInput: HTMLTextAreaElement;
  runButton: HTMLButtonElement;
  statusEl: HTMLElement;
  tableContainer: HTMLElement;
}

export function createAppLayout(root: HTMLElement): AppElements {
  root.innerHTML = '';
  root.classList.add('app-layout');

  const heading = document.createElement('h1');
  heading.textContent = 'Arrow WebTransport';

  const queryInput = document.createElement('textarea');
  queryInput.className = 'query-input';
  queryInput.placeholder = 'Enter query...';
  queryInput.value = 'get_arrow_data';
  queryInput.rows = 3;

  const runButton = document.createElement('button');
  runButton.className = 'btn-run';
  runButton.textContent = 'Run';

  const statusEl = document.createElement('div');
  statusEl.className = 'status';

  const tableContainer = document.createElement('div');
  tableContainer.className = 'table-container';

  root.append(heading, queryInput, runButton, statusEl, tableContainer);

  return { queryInput, runButton, statusEl, tableContainer };
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

type StatusKind = 'info' | 'error' | 'success';

export function setStatus(el: HTMLElement, message: string, kind: StatusKind = 'info'): void {
  el.textContent = message;
  el.className = `status status--${kind}`;
}
