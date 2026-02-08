import { makeTable, tableToIPC } from 'apache-arrow';
import { describe, expect, it } from 'vitest';
import { decodeBatchesFromStream, streamChunks } from '../decode.ts';

function mockReader(chunks: Uint8Array[]): ReadableStreamDefaultReader<Uint8Array> {
  let index = 0;
  return {
    read: async () => {
      if (index < chunks.length) {
        return { value: chunks[index++], done: false as const };
      }
      return { value: undefined, done: true as const };
    },
  } as ReadableStreamDefaultReader<Uint8Array>;
}

describe('streamChunks', () => {
  it('yields each chunk from the reader', async () => {
    const data = [new Uint8Array([1, 2]), new Uint8Array([3, 4, 5])];
    const yielded: Uint8Array[] = [];

    for await (const chunk of streamChunks(mockReader(data))) {
      yielded.push(chunk);
    }

    expect(yielded).toHaveLength(2);
    expect(Array.from(yielded[0])).toEqual([1, 2]);
    expect(Array.from(yielded[1])).toEqual([3, 4, 5]);
  });

  it('yields nothing for an empty reader', async () => {
    const yielded: Uint8Array[] = [];

    for await (const chunk of streamChunks(mockReader([]))) {
      yielded.push(chunk);
    }

    expect(yielded).toHaveLength(0);
  });
});

describe('decodeBatchesFromStream', () => {
  it('decodes Arrow IPC stream into RecordBatch objects', async () => {
    const table = makeTable({
      id: Int32Array.from([1, 2, 3]),
      value: Float64Array.from([10.5, 20.5, 30.5]),
    });

    const ipcBytes = tableToIPC(table, 'stream');
    const reader = mockReader([new Uint8Array(ipcBytes)]);

    const batches = [];
    for await (const batch of decodeBatchesFromStream(reader)) {
      batches.push(batch);
    }

    expect(batches.length).toBeGreaterThanOrEqual(1);
    expect(batches[0].schema.fields.map((f) => f.name)).toEqual(['id', 'value']);
    const totalRows = batches.reduce((sum, b) => sum + b.numRows, 0);
    expect(totalRows).toBe(3);
  });

  it('handles IPC data split across multiple chunks', async () => {
    const table = makeTable({
      id: Int32Array.from([1, 2, 3, 4, 5]),
    });

    const ipcBytes = new Uint8Array(tableToIPC(table, 'stream'));
    const mid = Math.floor(ipcBytes.length / 2);
    const chunk1 = ipcBytes.slice(0, mid);
    const chunk2 = ipcBytes.slice(mid);

    const reader = mockReader([chunk1, chunk2]);

    const batches = [];
    for await (const batch of decodeBatchesFromStream(reader)) {
      batches.push(batch);
    }

    const totalRows = batches.reduce((sum, b) => sum + b.numRows, 0);
    expect(totalRows).toBe(5);
  });
});
