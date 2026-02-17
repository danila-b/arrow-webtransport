const DEFAULT_CERT_HASH_URL = '/cert-hash.json';
const DEFAULT_SERVER_URL = 'https://127.0.0.1:4433';

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 300,
  maxDelayMs: 3000,
};

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
  await writer.close();

  return stream.readable.getReader();
}

export function isRetryableTransportError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;

  const message = err.message.toLowerCase();
  return (
    message.includes('connection lost') ||
    message.includes('network error') ||
    message.includes('stream reset') ||
    message.includes('connection closed') ||
    message.includes('transport closed')
  );
}

export function backoffDelayMs(attempt: number, cfg: RetryConfig): number {
  const exp = Math.min(cfg.baseDelayMs * 2 ** Math.max(0, attempt - 1), cfg.maxDelayMs);
  const jitter = Math.floor(Math.random() * Math.max(1, Math.floor(exp * 0.2)));
  return exp + jitter;
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
