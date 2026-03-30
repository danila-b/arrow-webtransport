import './style.css';
import {
  appendBatchRows,
  createAppLayout,
  getSelectedTransport,
  getSelectedWorkload,
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
import { type TransportCallbacks, type TransportResult, createTransport } from './transport.ts';
import { CUSTOM_WORKLOAD_ID, WORKLOADS } from './workloads.ts';

const root = document.getElementById('app');
if (!root) throw new Error('Missing #app element');

const {
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
} = createAppLayout(root);

workloadPicker.addEventListener('change', () => {
  const workload = WORKLOADS.find((w) => w.id === workloadPicker.value);
  if (workload) {
    queryInput.value = workload.sql;
  }
});

queryInput.addEventListener('input', () => {
  workloadPicker.value = CUSTOM_WORKLOAD_ID;
});

runButton.addEventListener('click', async () => {
  runButton.disabled = true;
  cancelButton.hidden = false;
  tableContainer.innerHTML = '';
  hideProgressBar(progressContainer);
  resetStatsPanel(statsContainer);
  showStatsPanel(statsContainer);

  const collector = new StatsCollector();
  collector.startLongTaskObserver();

  const workloadId = getSelectedWorkload(workloadPicker);
  collector.setWorkloadId(workloadId);

  const transportId = getSelectedTransport(transportPicker);
  collector.setTransportId(transportId);

  const transport = createTransport(transportId);

  let result: TransportResult | null = null;

  try {
    const MAX_DISPLAY_ROWS = 1000;
    const query = queryInput.value;
    let totalRows = 0;
    let displayedRows = 0;
    let columnNames: string[] | null = null;
    let tbody: HTMLTableSectionElement | null = null;
    let rowCountEl: HTMLElement | null = null;

    setStatus(statusEl, 'Connecting...', 'info');
    collector.markConnectStart();
    await transport.connect();
    collector.markConnectEnd();

    if (transport.supportsProgress) {
      showProgressBar(progressContainer);
    }

    const callbacks: TransportCallbacks = {
      onFirstByte(time) {
        collector.markFirstByte(time);
      },
      onBytes(n) {
        collector.addBytes(n);
      },
      onProgress(msg) {
        updateProgress(progressLabel, msg.rows, msg.batches);
      },
      onCancelAck() {
        collector.markCancelAck();
      },
    };

    cancelButton.onclick = async () => {
      collector.markCancelRequested();
      setStatus(statusEl, 'Cancelling...', 'info');
      try {
        await result?.cancel();
      } catch {
        // connection may already be closed
      }
    };

    collector.markQueryStart();
    setStatus(statusEl, 'Sending query...', 'info');
    result = await transport.executeQuery(query, callbacks);

    setStatus(statusEl, 'Receiving data...', 'info');

    for await (const batch of result.batches) {
      if (!columnNames || !tbody || !rowCountEl) {
        columnNames = batch.schema.fields.map((f) => f.name);
        const tableEls = initStreamingTable(tableContainer, batch.schema);
        tbody = tableEls.tbody;
        rowCountEl = tableEls.rowCountEl;
      }

      const newRows = batch.numRows;
      if (newRows > 0) {
        totalRows += newRows;
        collector.addRows(newRows);

        const displayCapacity = MAX_DISPLAY_ROWS - displayedRows;
        if (displayCapacity > 0) {
          const rowsToDisplay = Math.min(newRows, displayCapacity);
          appendBatchRows(tbody, batch, columnNames, 0, rowsToDisplay);
          displayedRows += rowsToDisplay;
        }

        updateRowCount(rowCountEl, displayedRows, totalRows);
        setStatus(statusEl, `Receiving data... ${totalRows} rows`, 'info');
      }
    }

    collector.markDone();
    setStatus(statusEl, `Done — ${totalRows} rows received`, 'success');
  } catch (err) {
    collector.markDone();
    const message = err instanceof Error ? err.message : String(err);
    setStatus(statusEl, message, 'error');
  } finally {
    transport.close();
    collector.stopLongTaskObserver();
    renderStats(statsContainer, collector.snapshot());
    runButton.disabled = false;
    cancelButton.hidden = true;
    cancelButton.onclick = null;
    hideProgressBar(progressContainer);
  }
});
