import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { backoffDelayMs, isRetryableTransportError, loadCertHash } from '../transport.ts';

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
