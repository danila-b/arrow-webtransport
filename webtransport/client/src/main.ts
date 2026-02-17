import './style.css';
import { decodeBatchesFromStream } from './decode.ts';
import { appendBatchRows, createAppLayout, initStreamingTable, setStatus, updateRowCount } from './render.ts';
import {
  backoffDelayMs,
  connect,
  DEFAULT_RETRY_CONFIG,
  isRetryableTransportError,
  loadCertHash,
  openQueryStream,
  sleep,
} from './transport.ts';

const root = document.getElementById('app');
if (!root) throw new Error('Missing #app element');

const { queryInput, runButton, statusEl, tableContainer } = createAppLayout(root);

runButton.addEventListener('click', async () => {
  runButton.disabled = true;
  tableContainer.innerHTML = '';

  try {
    setStatus(statusEl, 'Loading certificate...', 'info');
    const certHash = await loadCertHash();

    const query = queryInput.value;
    let totalRows = 0;
    let columnNames: string[] | null = null;
    let tbody: HTMLTableSectionElement | null = null;
    let rowCountEl: HTMLElement | null = null;
    const attempts = DEFAULT_RETRY_CONFIG.maxRetries + 1;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      let transport: WebTransport | null = null;
      let shouldRetry = false;
      let retryError: unknown = null;

      try {
        setStatus(
          statusEl,
          attempt === 1 ? 'Connecting...' : `Reconnecting... attempt ${attempt}/${attempts}`,
          'info',
        );

        transport = await connect(certHash);

        setStatus(statusEl, 'Sending query...', 'info');
        const reader = await openQueryStream(transport, query);

        let rowsToSkip = totalRows;
        setStatus(statusEl, `Receiving data... ${totalRows} rows`, 'info');

        for await (const batch of decodeBatchesFromStream(reader)) {
          if (!columnNames || !tbody || !rowCountEl) {
            columnNames = batch.schema.fields.map((f) => f.name);
            const tableEls = initStreamingTable(tableContainer, batch.schema);
            tbody = tableEls.tbody;
            rowCountEl = tableEls.rowCountEl;
          }

          const startRow = Math.min(rowsToSkip, batch.numRows);
          rowsToSkip -= startRow;

          if (startRow < batch.numRows) {
            appendBatchRows(tbody, batch, columnNames, startRow);
            totalRows += batch.numRows - startRow;
            updateRowCount(rowCountEl, totalRows);
            setStatus(statusEl, `Receiving data... ${totalRows} rows`, 'info');
          }
        }

        setStatus(statusEl, `Done — ${totalRows} rows received`, 'success');
        return;
      } catch (err) {
        const hasMoreAttempts = attempt < attempts;
        if (hasMoreAttempts && isRetryableTransportError(err)) {
          shouldRetry = true;
          retryError = err;
        } else {
          throw err;
        }
      } finally {
        transport?.close();
      }

      if (shouldRetry) {
        const delayMs = backoffDelayMs(attempt, DEFAULT_RETRY_CONFIG);
        setStatus(
          statusEl,
          `Connection lost, retrying in ${delayMs}ms (kept ${totalRows} rows; requires stable row order)...`,
          'info',
        );
        await sleep(delayMs);
      } else if (retryError) {
        throw retryError;
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    setStatus(statusEl, message, 'error');
  } finally {
    runButton.disabled = false;
  }
});
