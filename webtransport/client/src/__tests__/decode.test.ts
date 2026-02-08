import { makeTable, tableToIPC } from 'apache-arrow';
import { describe, expect, it } from 'vitest';
import { collectChunks, concatBuffers, decodeArrowTable } from '../decode.ts';

describe('concatBuffers', () => {
  it('returns empty buffer for empty array', () => {
    const result = concatBuffers([]);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(0);
  });

  it('returns identical buffer for single chunk', () => {
    const chunk = new Uint8Array([1, 2, 3]);
    const result = concatBuffers([chunk]);
    expect(Array.from(result)).toEqual([1, 2, 3]);
  });

  it('concatenates multiple chunks in order', () => {
    const a = new Uint8Array([1, 2]);
    const b = new Uint8Array([3, 4, 5]);
    const c = new Uint8Array([6]);
    const result = concatBuffers([a, b, c]);
    expect(Array.from(result)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('decodeArrowTable', () => {
  it('round-trips a table through IPC encoding', () => {
    const original = makeTable({
      id: Int32Array.from([1, 2, 3]),
      value: Float64Array.from([10.5, 20.5, 30.5]),
    });

    const ipcBytes = tableToIPC(original, 'stream');
    const decoded = decodeArrowTable(ipcBytes);

    expect(decoded.numRows).toBe(3);
    expect(decoded.schema.fields.map((f) => f.name)).toEqual(['id', 'value']);
  });
});

describe('collectChunks', () => {
  it('collects all chunks from a reader', async () => {
    const data = [new Uint8Array([1, 2]), new Uint8Array([3, 4])];
    let index = 0;

    const mockReader = {
      read: async () => {
        if (index < data.length) {
          return { value: data[index++], done: false as const };
        }
        return { value: undefined, done: true as const };
      },
    } as ReadableStreamDefaultReader<Uint8Array>;

    const chunks = await collectChunks(mockReader);
    expect(chunks).toHaveLength(2);
    expect(Array.from(chunks[0])).toEqual([1, 2]);
    expect(Array.from(chunks[1])).toEqual([3, 4]);
  });

  it('returns empty array for reader with no data', async () => {
    const mockReader = {
      read: async () => ({ value: undefined, done: true as const }),
    } as ReadableStreamDefaultReader<Uint8Array>;

    const chunks = await collectChunks(mockReader);
    expect(chunks).toHaveLength(0);
  });
});
