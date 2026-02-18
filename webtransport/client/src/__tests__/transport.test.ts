import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { backoffDelayMs, instrumentReader, isRetryableTransportError, loadCertHash } from '../transport.ts';

describe('loadCertHash', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns Uint8Array from hash response', async () => {
    const mockHash = [1, 2, 3, 4, 5];
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ hash: mockHash }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await loadCertHash('/test-cert-hash.json');

    expect(result).toBeInstanceOf(Uint8Array);
    expect(Array.from(result)).toEqual(mockHash);
  });

  it('throws on non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('Not found', { status: 404 }));

    await expect(loadCertHash('/missing.json')).rejects.toThrow('Failed to load certificate hash');
  });
});

describe('isRetryableTransportError', () => {
  it('returns true for known transient transport errors', () => {
    expect(isRetryableTransportError(new Error('Connection lost'))).toBe(true);
    expect(isRetryableTransportError(new Error('stream reset by peer'))).toBe(true);
    expect(isRetryableTransportError(new Error('Network error while reading stream'))).toBe(true);
  });

  it('returns false for non-transport errors', () => {
    expect(isRetryableTransportError(new Error('Failed to decode Arrow stream'))).toBe(false);
    expect(isRetryableTransportError('Connection lost')).toBe(false);
  });
});

describe('backoffDelayMs', () => {
  it('returns bounded exponential delay with jitter', () => {
    const cfg = { maxRetries: 3, baseDelayMs: 200, maxDelayMs: 1000 };
    const delay1 = backoffDelayMs(1, cfg);
    const delay2 = backoffDelayMs(2, cfg);
    const delay3 = backoffDelayMs(5, cfg);

    expect(delay1).toBeGreaterThanOrEqual(200);
    expect(delay1).toBeLessThan(240);

    expect(delay2).toBeGreaterThanOrEqual(400);
    expect(delay2).toBeLessThan(480);

    expect(delay3).toBeGreaterThanOrEqual(1000);
    expect(delay3).toBeLessThan(1200);
  });
});

function mockReader(chunks: Uint8Array[]): ReadableStreamDefaultReader<Uint8Array> {
  let index = 0;
  return {
    read: async () => {
      if (index < chunks.length) {
        return { value: chunks[index++], done: false as const };
      }
      return { value: undefined, done: true as const };
    },
    cancel: vi.fn(async () => {}),
    releaseLock: vi.fn(),
    closed: Promise.resolve(undefined),
  } as unknown as ReadableStreamDefaultReader<Uint8Array>;
}

describe('instrumentReader', () => {
  it('fires onChunk callback with byte length for each chunk', async () => {
    const chunks = [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5])];
    const reader = mockReader(chunks);
    const calls: Array<{ bytes: number; time: number }> = [];

    const instrumented = instrumentReader(reader, (bytes, time) => {
      calls.push({ bytes, time });
    });

    await instrumented.read();
    await instrumented.read();
    await instrumented.read();

    expect(calls).toHaveLength(2);
    expect(calls[0].bytes).toBe(3);
    expect(calls[1].bytes).toBe(2);
  });

  it('does not fire onChunk for the done signal', async () => {
    const reader = mockReader([]);
    const calls: number[] = [];

    const instrumented = instrumentReader(reader, (bytes) => {
      calls.push(bytes);
    });

    await instrumented.read();

    expect(calls).toHaveLength(0);
  });

  it('passes through read results unchanged', async () => {
    const chunk = new Uint8Array([10, 20, 30]);
    const reader = mockReader([chunk]);

    const instrumented = instrumentReader(reader, () => {});

    const result = await instrumented.read();
    expect(result.done).toBe(false);
    expect(Array.from(result.value!)).toEqual([10, 20, 30]);

    const doneResult = await instrumented.read();
    expect(doneResult.done).toBe(true);
  });

  it('delegates cancel to the underlying reader', async () => {
    const reader = mockReader([]);
    const instrumented = instrumentReader(reader, () => {});

    await instrumented.cancel('test reason');
    expect(reader.cancel).toHaveBeenCalledWith('test reason');
  });

  it('delegates releaseLock to the underlying reader', () => {
    const reader = mockReader([]);
    const instrumented = instrumentReader(reader, () => {});

    instrumented.releaseLock();
    expect(reader.releaseLock).toHaveBeenCalled();
  });
});
