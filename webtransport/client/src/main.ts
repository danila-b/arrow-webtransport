import './style.css';
import { collectChunks, concatBuffers, decodeArrowTable } from './decode.ts';
import { createAppLayout, renderArrowTable, setStatus } from './render.ts';
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
    const chunks = await collectChunks(reader);
    const buffer = concatBuffers(chunks);
    const table = decodeArrowTable(buffer);

    renderArrowTable(table, tableContainer);
    setStatus(statusEl, `Done — ${table.numRows} rows received`, 'success');

    transport.close();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    setStatus(statusEl, message, 'error');
  } finally {
    runButton.disabled = false;
  }
});
