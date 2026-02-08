import { tableFromIPC } from 'apache-arrow';

async function loadCertHash(): Promise<Uint8Array> {
  const resp = await fetch('/cert-hash.json');
  if (!resp.ok) {
    throw new Error(
      'Failed to load certificate hash. Make sure the server has been started at least once to generate certificates.',
    );
  }
  const { hash } = (await resp.json()) as { hash: number[] };
  return new Uint8Array(hash);
}

async function main() {
  const certHash = await loadCertHash();

  // Create WebTransport connection with certificate hash
  const transport = new WebTransport('https://127.0.0.1:4433', {
    serverCertificateHashes: [
      {
        algorithm: 'sha-256',
        value: certHash.buffer as ArrayBuffer,
      },
    ],
  });

  await transport.ready;
  console.log('WebTransport connection established');

  const stream = await transport.createBidirectionalStream();

  const writer = stream.writable.getWriter();
  await writer.write(new TextEncoder().encode('get_arrow_data'));
  writer.releaseLock();

  const reader = stream.readable.getReader();
  const chunks = [];

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const buffer = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }

  const table = tableFromIPC(buffer);
  console.log('Arrow rows:', table.numRows);
  console.log(table.toString());

  transport.close();
}

main().catch(console.error);
