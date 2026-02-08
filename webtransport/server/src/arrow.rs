use anyhow::Result;
use arrow::array::{Int32Array, StringArray};
use arrow::datatypes::{DataType, Field, Schema};
use arrow::ipc::writer::StreamWriter;
use arrow::record_batch::RecordBatch;
use std::sync::Arc;

/// Serialize a `RecordBatch` into Arrow IPC stream format bytes.
pub fn encode_batch(batch: &RecordBatch) -> Result<Vec<u8>> {
    let mut buffer = Vec::new();
    {
        let mut writer = StreamWriter::try_new(&mut buffer, &batch.schema())?;
        writer.write(batch)?;
        writer.finish()?;
    }
    Ok(buffer)
}

/// Build a small demo `RecordBatch` for testing the end-to-end pipeline.
pub fn create_demo_batch() -> Result<RecordBatch> {
    let schema = Arc::new(Schema::new(vec![
        Field::new("id", DataType::Int32, false),
        Field::new("name", DataType::Utf8, false),
        Field::new("value", DataType::Int32, false),
    ]));

    let batch = RecordBatch::try_new(
        schema,
        vec![
            Arc::new(Int32Array::from(vec![1, 2, 3, 4, 5])),
            Arc::new(StringArray::from(vec![
                "Alice", "Bob", "Charlie", "David", "Eve",
            ])),
            Arc::new(Int32Array::from(vec![100, 200, 300, 400, 500])),
        ],
    )?;

    Ok(batch)
}

#[cfg(test)]
mod tests {
    use super::*;
    use arrow::datatypes::DataType;
    use arrow::ipc::reader::StreamReader;
    use std::io::Cursor;

    #[test]
    fn demo_batch_shape() {
        let batch = create_demo_batch().unwrap();
        assert_eq!(batch.num_rows(), 5);
        assert_eq!(batch.num_columns(), 3);

        let schema = batch.schema();
        assert_eq!(schema.field(0).name(), "id");
        assert_eq!(schema.field(1).name(), "name");
        assert_eq!(schema.field(2).name(), "value");
        assert_eq!(*schema.field(0).data_type(), DataType::Int32);
        assert_eq!(*schema.field(1).data_type(), DataType::Utf8);
        assert_eq!(*schema.field(2).data_type(), DataType::Int32);
    }

    #[test]
    fn encode_decode_roundtrip() {
        let original = create_demo_batch().unwrap();
        let bytes = encode_batch(&original).unwrap();

        let cursor = Cursor::new(bytes);
        let mut reader = StreamReader::try_new(cursor, None).unwrap();

        assert_eq!(reader.schema(), original.schema());

        let decoded = reader.next().unwrap().unwrap();
        assert_eq!(decoded.num_rows(), original.num_rows());
        assert_eq!(decoded.num_columns(), original.num_columns());

        assert!(reader.next().is_none());
    }

    #[test]
    fn encode_empty_batch() {
        let schema = Arc::new(Schema::new(vec![
            Field::new("x", DataType::Int32, false),
        ]));
        let empty = RecordBatch::try_new(
            schema,
            vec![Arc::new(Int32Array::from(Vec::<i32>::new()))],
        )
        .unwrap();

        let bytes = encode_batch(&empty).unwrap();
        assert!(!bytes.is_empty());

        let cursor = Cursor::new(bytes);
        let mut reader = StreamReader::try_new(cursor, None).unwrap();
        let decoded = reader.next().unwrap().unwrap();
        assert_eq!(decoded.num_rows(), 0);
    }
}
