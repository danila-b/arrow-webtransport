const DEFAULT_CERT_HASH_URL = '/cert-hash.json';
const DEFAULT_SERVER_URL = 'https://127.0.0.1:4433';

export async function loadCertHash(url = DEFAULT_CERT_HASH_URL): Promise<Uint8Array> {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(
      'Failed to load certificate hash. Make sure the server has been started at least once to generate certificates.',
    );
  }
  const { hash } = (await resp.json()) as { hash: number[] };
  return new Uint8Array(hash);
}

export async function connect(certHash: Uint8Array, serverUrl = DEFAULT_SERVER_URL): Promise<WebTransport> {
  const transport = new WebTransport(serverUrl, {
    serverCertificateHashes: [
      {
        algorithm: 'sha-256',
        value: certHash.buffer as ArrayBuffer,
      },
    ],
  });
  await transport.ready;
  return transport;
}

export async function openQueryStream(
  transport: WebTransport,
  query: string,
): Promise<ReadableStreamDefaultReader<Uint8Array>> {
  const stream = await transport.createBidirectionalStream();

  const writer = stream.writable.getWriter();
  await writer.write(new TextEncoder().encode(query));
  writer.releaseLock();

  return stream.readable.getReader();
}
