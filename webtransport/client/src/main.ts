import './style.css';
import { decodeBatchesFromStream } from './decode.ts';
import {
  appendBatchRows,
  createAppLayout,
  hideProgressBar,
  initStreamingTable,
  renderStats,
  resetStatsPanel,
  setStatus,
  showProgressBar,
  showStatsPanel,
  updateProgress,
  updateRowCount,
} from './render.ts';
import { StatsCollector } from './stats.ts';
import {
  DEFAULT_RETRY_CONFIG,
  backoffDelayMs,
  connect,
  instrumentReader,
  isRetryableTransportError,
  listenForDatagrams,
  loadCertHash,
  openQueryStream,
  sendCancelDatagram,
  sleep,
} from './transport.ts';

const root = document.getElementById('app');
if (!root) throw new Error('Missing #app element');

const {
  queryInput,
  runButton,
  cancelButton,
  statusEl,
  progressContainer,
  progressLabel,
  statsContainer,
  tableContainer,
} = createAppLayout(root);

runButton.addEventListener('click', async () => {
  runButton.disabled = true;
  cancelButton.hidden = false;
  tableContainer.innerHTML = '';
  hideProgressBar(progressContainer);
  resetStatsPanel(statsContainer);
  showStatsPanel(statsContainer);

  const collector = new StatsCollector();
  collector.startLongTaskObserver();

  try {
    setStatus(statusEl, 'Loading certificate...', 'info');
    const certHash = await loadCertHash();

    const MAX_DISPLAY_ROWS = 1000;
    const query = queryInput.value;
    let totalRows = 0;
    let displayedRows = 0;
    let columnNames: string[] | null = null;
    let tbody: HTMLTableSectionElement | null = null;
    let rowCountEl: HTMLElement | null = null;
    const attempts = DEFAULT_RETRY_CONFIG.maxRetries + 1;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      let transport: WebTransport | null = null;
      let datagramListener: ReturnType<typeof listenForDatagrams> | null = null;
      let shouldRetry = false;
      let retryError: unknown = null;

      if (attempt > 1) collector.addRestart();

      try {
        setStatus(statusEl, attempt === 1 ? 'Connecting...' : `Reconnecting... attempt ${attempt}/${attempts}`, 'info');

        collector.markConnectStart();
        transport = await connect(certHash);
        collector.markConnectEnd();

        showProgressBar(progressContainer);
        datagramListener = listenForDatagrams(transport, {
          onProgress(msg) {
            updateProgress(progressLabel, msg.rows, msg.batches);
          },
          onCancelAck() {
            collector.markCancelAck();
          },
        });

        cancelButton.onclick = async () => {
          if (transport) {
            collector.markCancelRequested();
            setStatus(statusEl, 'Cancelling...', 'info');
            try {
              await sendCancelDatagram(transport);
            } catch {
              // connection may already be closed
            }
          }
        };

        collector.markQueryStart();
        setStatus(statusEl, 'Sending query...', 'info');
        const reader = await openQueryStream(transport, query);
        const instrumented = instrumentReader(reader, (bytes, time) => {
          collector.markFirstByte(time);
          collector.addBytes(bytes);
        });

        let rowsToSkip = totalRows;
        setStatus(statusEl, `Receiving data... ${totalRows} rows`, 'info');

        for await (const batch of decodeBatchesFromStream(instrumented)) {
          if (!columnNames || !tbody || !rowCountEl) {
            columnNames = batch.schema.fields.map((f) => f.name);
            const tableEls = initStreamingTable(tableContainer, batch.schema);
            tbody = tableEls.tbody;
            rowCountEl = tableEls.rowCountEl;
          }

          const startRow = Math.min(rowsToSkip, batch.numRows);
          rowsToSkip -= startRow;
          const newRows = batch.numRows - startRow;

          if (newRows > 0) {
            totalRows += newRows;
            collector.addRows(newRows);

            const displayCapacity = MAX_DISPLAY_ROWS - displayedRows;
            if (displayCapacity > 0) {
              const rowsToDisplay = Math.min(newRows, displayCapacity);
              appendBatchRows(tbody, batch, columnNames, startRow, startRow + rowsToDisplay);
              displayedRows += rowsToDisplay;
            }

            updateRowCount(rowCountEl, displayedRows, totalRows);
            setStatus(statusEl, `Receiving data... ${totalRows} rows`, 'info');
          }
        }

        collector.markDone();
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
        datagramListener?.stop();
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
    collector.markDone();
    const message = err instanceof Error ? err.message : String(err);
    setStatus(statusEl, message, 'error');
  } finally {
    collector.stopLongTaskObserver();
    renderStats(statsContainer, collector.snapshot());
    runButton.disabled = false;
    cancelButton.hidden = true;
    cancelButton.onclick = null;
    hideProgressBar(progressContainer);
  }
});
