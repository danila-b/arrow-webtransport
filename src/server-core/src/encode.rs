use anyhow::Result;
use arrow::datatypes::SchemaRef;
use arrow::ipc::writer::StreamWriter;
use arrow::record_batch::RecordBatch;
use std::io::Write;

/// A buffer wrapper that accumulates bytes written by `StreamWriter` and
/// allows draining them after each write operation. This enables incremental
/// IPC streaming: write schema → drain → write batch → drain → … → finish → drain.
struct FlushableBuffer {
    inner: Vec<u8>,
}

impl FlushableBuffer {
    fn new() -> Self {
        Self { inner: Vec::new() }
    }

    /// Take all bytes written since the last drain.
    fn drain(&mut self) -> Vec<u8> {
        std::mem::take(&mut self.inner)
    }
}

impl Write for FlushableBuffer {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        self.inner.write(buf)
    }

    fn flush(&mut self) -> std::io::Result<()> {
        Ok(())
    }
}

/// Incremental Arrow IPC stream encoder.
///
/// Wraps an Arrow `StreamWriter` with a drainable buffer so that schema header,
/// individual record batches, and the EOS marker can each be extracted as byte
/// chunks and sent over the network independently.
pub struct StreamEncoder {
    writer: StreamWriter<FlushableBuffer>,
}

impl StreamEncoder {
    /// Create a new encoder for the given schema.
    ///
    /// After construction the internal buffer already contains the IPC schema
    /// header bytes — call [`drain`](Self::drain) to retrieve them.
    pub fn try_new(schema: &SchemaRef) -> Result<Self> {
        let buffer = FlushableBuffer::new();
        let writer = StreamWriter::try_new(buffer, schema)?;
        Ok(Self { writer })
    }

    /// Encode a single `RecordBatch`. The new IPC bytes are appended to the
    /// internal buffer — call [`drain`](Self::drain) to retrieve them.
    pub fn write_batch(&mut self, batch: &RecordBatch) -> Result<()> {
        self.writer.write(batch)?;
        Ok(())
    }

    /// Write the IPC end-of-stream marker.
    /// Call [`drain`](Self::drain) afterwards to retrieve the final bytes.
    pub fn finish(&mut self) -> Result<()> {
        self.writer.finish()?;
        Ok(())
    }

    /// Drain all bytes written since the last drain.
    pub fn drain(&mut self) -> Vec<u8> {
        self.writer.get_mut().drain()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use arrow::array::Int32Array;
    use arrow::datatypes::{DataType, Field, Schema};
    use arrow::ipc::reader::StreamReader;
    use arrow::record_batch::RecordBatch;
    use std::io::Cursor;
    use std::sync::Arc;

    #[test]
    fn incremental_encode_decode() {
        let schema = Arc::new(Schema::new(vec![Field::new("x", DataType::Int32, false)]));

        let mut encoder = StreamEncoder::try_new(&schema).unwrap();

        let header = encoder.drain();
        assert!(!header.is_empty());

        let b1 = RecordBatch::try_new(
            schema.clone(),
            vec![Arc::new(Int32Array::from(vec![1, 2, 3]))],
        )
        .unwrap();
        encoder.write_batch(&b1).unwrap();
        let chunk1 = encoder.drain();
        assert!(!chunk1.is_empty());

        let b2 = RecordBatch::try_new(schema.clone(), vec![Arc::new(Int32Array::from(vec![4, 5]))])
            .unwrap();
        encoder.write_batch(&b2).unwrap();
        let chunk2 = encoder.drain();
        assert!(!chunk2.is_empty());

        encoder.finish().unwrap();
        let footer = encoder.drain();

        let mut full = Vec::new();
        full.extend_from_slice(&header);
        full.extend_from_slice(&chunk1);
        full.extend_from_slice(&chunk2);
        full.extend_from_slice(&footer);

        let cursor = Cursor::new(full);
        let mut reader = StreamReader::try_new(cursor, None).unwrap();

        let decoded1 = reader.next().unwrap().unwrap();
        assert_eq!(decoded1.num_rows(), 3);

        let decoded2 = reader.next().unwrap().unwrap();
        assert_eq!(decoded2.num_rows(), 2);

        assert!(reader.next().is_none());
    }
}
