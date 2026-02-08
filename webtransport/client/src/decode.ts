import { type RecordBatch, RecordBatchReader } from 'apache-arrow';

export async function* streamChunks(reader: ReadableStreamDefaultReader<Uint8Array>): AsyncGenerator<Uint8Array> {
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    yield value;
  }
}

export async function* decodeBatchesFromStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): AsyncGenerator<RecordBatch> {
  const batchReader = await RecordBatchReader.from(streamChunks(reader));
  yield* batchReader;
}
