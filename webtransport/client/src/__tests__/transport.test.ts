import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadCertHash } from '../transport.ts';

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
