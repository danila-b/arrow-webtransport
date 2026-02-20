import type { RecordBatch } from 'apache-arrow';
import { tableFromJSON } from 'apache-arrow';
import { decodeBatchesFromStream } from './decode.ts';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface ProgressMessage {
  type: 'progress';
  rows: number;
  batches: number;
  bytes?: number;
}

export interface TransportCallbacks {
  onFirstByte(time: number): void;
  onBytes(n: number): void;
  onProgress(msg: ProgressMessage): void;
  onCancelAck(): void;
}

export interface TransportResult {
  batches: AsyncIterable<RecordBatch>;
  cancel(): Promise<void>;
}

export interface QueryTransport {
  readonly name: string;
  readonly supportsProgress: boolean;
  connect(): Promise<void>;
  executeQuery(sql: string, callbacks: TransportCallbacks): Promise<TransportResult>;
  close(): void;
}

// ---------------------------------------------------------------------------
// Helpers shared across adapters
// ---------------------------------------------------------------------------

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

function instrumentReader(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onChunk: (byteLength: number, time: number) => void,
): ReadableStreamDefaultReader<Uint8Array> {
  return {
    read: async () => {
      const result = await reader.read();
      if (!result.done && result.value) {
        onChunk(result.value.byteLength, performance.now());
      }
      return result;
    },
    cancel: (reason?: unknown) => reader.cancel(reason),
    releaseLock: () => reader.releaseLock(),
    closed: reader.closed,
  } as ReadableStreamDefaultReader<Uint8Array>;
}

// ---------------------------------------------------------------------------
// WebTransport adapter
// ---------------------------------------------------------------------------

const DEFAULT_CERT_HASH_URL = '/cert-hash.json';
const WT_SERVER_URL = 'https://127.0.0.1:4433';

export async function loadCertHash(url = DEFAULT_CERT_HASH_URL): Promise<Uint8Array> {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(
      'Failed to load certificate hash. Make sure the WebTransport server has been started at least once.',
    );
  }
  const { hash } = (await resp.json()) as { hash: number[] };
  return new Uint8Array(hash);
}

interface DatagramListener {
  stop(): void;
  done: Promise<void>;
}

function listenForDatagrams(
  transport: WebTransport,
  callbacks: { onProgress: (msg: ProgressMessage) => void; onCancelAck?: () => void },
): DatagramListener {
  const { onProgress, onCancelAck } = callbacks;
  const reader = transport.datagrams.readable.getReader();
  let stopped = false;

  const done = (async () => {
    const decoder = new TextDecoder();
    try {
      while (!stopped) {
        const { value, done } = await reader.read();
        if (done) break;
        try {
          const msg = JSON.parse(decoder.decode(value));
          if (msg.type === 'progress') {
            onProgress(msg as ProgressMessage);
          } else if (msg.type === 'cancel_ack' && onCancelAck) {
            onCancelAck();
          }
        } catch {
          // ignore malformed datagrams
        }
      }
    } catch {
      // reader cancelled or connection closed
    }
  })();

  return {
    stop() {
      stopped = true;
      reader.cancel().catch(() => {});
    },
    done,
  };
}

export class WebTransportAdapter implements QueryTransport {
  readonly name = 'WebTransport (QUIC)';
  readonly supportsProgress = true;

  private certHash: Uint8Array | null = null;
  private transport: WebTransport | null = null;
  private datagramListener: DatagramListener | null = null;

  async connect(): Promise<void> {
    if (!this.certHash) {
      this.certHash = await loadCertHash();
    }
    const transport = new WebTransport(WT_SERVER_URL, {
      serverCertificateHashes: [{ algorithm: 'sha-256', value: this.certHash.buffer as ArrayBuffer }],
    });
    await transport.ready;
    this.transport = transport;
  }

  async executeQuery(sql: string, callbacks: TransportCallbacks): Promise<TransportResult> {
    if (!this.transport) throw new Error('Not connected');
    const transport = this.transport;

    this.datagramListener = listenForDatagrams(transport, {
      onProgress: callbacks.onProgress,
      onCancelAck: callbacks.onCancelAck,
    });

    const stream = await transport.createBidirectionalStream();
    const writer = stream.writable.getWriter();
    await writer.write(new TextEncoder().encode(sql));
    await writer.close();

    let firstByteFired = false;
    const reader = instrumentReader(stream.readable.getReader(), (bytes, time) => {
      if (!firstByteFired) {
        callbacks.onFirstByte(time);
        firstByteFired = true;
      }
      callbacks.onBytes(bytes);
    });

    const batches = decodeBatchesFromStream(reader);

    const cancel = async () => {
      const dgWriter = transport.datagrams.writable.getWriter();
      try {
        await dgWriter.write(new TextEncoder().encode(JSON.stringify({ type: 'cancel' })));
      } finally {
        dgWriter.releaseLock();
      }
    };

    return { batches, cancel };
  }

  close(): void {
    this.datagramListener?.stop();
    this.datagramListener = null;
    this.transport?.close();
    this.transport = null;
  }
}

// ---------------------------------------------------------------------------
// HTTP/2 Arrow IPC adapter
// ---------------------------------------------------------------------------

const HTTP_ARROW_URL = 'http://127.0.0.1:3000/query';

export class HttpArrowAdapter implements QueryTransport {
  readonly name = 'HTTP/2 Arrow IPC';
  readonly supportsProgress = false;

  private controller: AbortController | null = null;

  async connect(): Promise<void> {
    // No persistent connection needed for fetch
  }

  async executeQuery(sql: string, callbacks: TransportCallbacks): Promise<TransportResult> {
    this.controller = new AbortController();
    const { signal } = this.controller;

    const response = await fetch(HTTP_ARROW_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql }),
      signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `HTTP ${response.status}`);
    }

    const body = response.body;
    if (!body) throw new Error('No response body');

    let firstByteFired = false;
    const reader = instrumentReader(body.getReader(), (bytes, time) => {
      if (!firstByteFired) {
        callbacks.onFirstByte(time);
        firstByteFired = true;
      }
      callbacks.onBytes(bytes);
    });

    const batches = decodeBatchesFromStream(reader);

    const cancel = async () => {
      this.controller?.abort();
    };

    return { batches, cancel };
  }

  close(): void {
    this.controller?.abort();
    this.controller = null;
  }
}

// ---------------------------------------------------------------------------
// HTTP/2 JSON adapter
// ---------------------------------------------------------------------------

const HTTP_JSON_URL = 'http://127.0.0.1:3001/query';

export class HttpJsonAdapter implements QueryTransport {
  readonly name = 'HTTP/2 JSON';
  readonly supportsProgress = false;

  private controller: AbortController | null = null;

  async connect(): Promise<void> {
    // No persistent connection needed for fetch
  }

  async executeQuery(sql: string, callbacks: TransportCallbacks): Promise<TransportResult> {
    this.controller = new AbortController();
    const { signal } = this.controller;

    const response = await fetch(HTTP_JSON_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql }),
      signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `HTTP ${response.status}`);
    }

    callbacks.onFirstByte(performance.now());

    const text = await response.text();
    callbacks.onBytes(text.length);

    const rows = JSON.parse(text) as Record<string, unknown>[];
    const table = tableFromJSON(rows);

    async function* yieldBatches() {
      for (const batch of table.batches) {
        yield batch;
      }
    }

    const cancel = async () => {
      this.controller?.abort();
    };

    return { batches: yieldBatches(), cancel };
  }

  close(): void {
    this.controller?.abort();
    this.controller = null;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export type TransportId = 'webtransport' | 'http2-arrow' | 'http2-json';

export function createTransport(id: TransportId): QueryTransport {
  switch (id) {
    case 'webtransport':
      return new WebTransportAdapter();
    case 'http2-arrow':
      return new HttpArrowAdapter();
    case 'http2-json':
      return new HttpJsonAdapter();
  }
}
