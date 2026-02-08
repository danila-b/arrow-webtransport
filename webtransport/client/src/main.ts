import './style.css';
import { decodeBatchesFromStream } from './decode.ts';
import { appendBatchRows, createAppLayout, initStreamingTable, setStatus, updateRowCount } from './render.ts';
import { connect, loadCertHash, openQueryStream } from './transport.ts';

const root = document.getElementById('app');
if (!root) throw new Error('Missing #app element');

const { queryInput, runButton, statusEl, tableContainer } = createAppLayout(root);

runButton.addEventListener('click', async () => {
  runButton.disabled = true;
  tableContainer.innerHTML = '';

  try {
    setStatus(statusEl, 'Loading certificate...', 'info');
    const certHash = await loadCertHash();

    setStatus(statusEl, 'Connecting...', 'info');
    const transport = await connect(certHash);

    setStatus(statusEl, 'Sending query...', 'info');
    const reader = await openQueryStream(transport, queryInput.value);

    setStatus(statusEl, 'Receiving data...', 'info');

    const batches = decodeBatchesFromStream(reader);
    const first = await batches.next();

    if (first.done) {
      setStatus(statusEl, 'Done — 0 rows received', 'success');
      transport.close();
      return;
    }

    const columnNames = first.value.schema.fields.map((f) => f.name);
    const { tbody, rowCountEl } = initStreamingTable(tableContainer, first.value.schema);

    let totalRows = 0;
    appendBatchRows(tbody, first.value, columnNames);
    totalRows += first.value.numRows;
    updateRowCount(rowCountEl, totalRows);
    setStatus(statusEl, `Receiving data... ${totalRows} rows`, 'info');

    for await (const batch of batches) {
      appendBatchRows(tbody, batch, columnNames);
      totalRows += batch.numRows;
      updateRowCount(rowCountEl, totalRows);
      setStatus(statusEl, `Receiving data... ${totalRows} rows`, 'info');
    }

    setStatus(statusEl, `Done — ${totalRows} rows received`, 'success');

    transport.close();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    setStatus(statusEl, message, 'error');
  } finally {
    runButton.disabled = false;
  }
});
