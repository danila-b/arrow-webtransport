import { tableFromIPC } from 'apache-arrow';

async function main() {
  // IMPORTANT: Replace this hash with the one printed by your server
  const certHash = new Uint8Array([
    44, 72, 166, 24, 52, 195, 230, 39, 31, 28, 79, 14, 186, 83, 134, 87, 119, 45, 48, 185, 191, 12, 167, 38, 128, 158,
    140, 219, 148, 220, 66, 190,
  ]);

  // Create WebTransport connection with certificate hash
  const transport = new WebTransport('https://127.0.0.1:4433', {
    serverCertificateHashes: [
      {
        algorithm: 'sha-256',
        value: certHash,
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
