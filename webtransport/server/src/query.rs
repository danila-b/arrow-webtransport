use anyhow::Result;
use datafusion::arrow::array::{Float64Array, Int32Array, StringArray};
use datafusion::arrow::datatypes::{DataType, Field, Schema};
use datafusion::arrow::record_batch::RecordBatch;
use datafusion::prelude::SessionContext;
use std::sync::Arc;

/// Create a DataFusion `SessionContext` with a demo in-memory table registered.
///
/// The "demo" table has 10 rows with columns: id (Int32), name (Utf8), value (Float64), city (Utf8).
pub async fn create_context() -> Result<SessionContext> {
    let ctx = SessionContext::new();

    let schema = Arc::new(Schema::new(vec![
        Field::new("id", DataType::Int32, false),
        Field::new("name", DataType::Utf8, false),
        Field::new("value", DataType::Float64, false),
        Field::new("city", DataType::Utf8, false),
    ]));

    let batch = RecordBatch::try_new(
        schema,
        vec![
            Arc::new(Int32Array::from(vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10])),
            Arc::new(StringArray::from(vec![
                "Alice", "Bob", "Charlie", "David", "Eve", "Frank", "Grace", "Heidi", "Ivan",
                "Judy",
            ])),
            Arc::new(Float64Array::from(vec![
                120.5, 250.0, 89.99, 310.75, 175.0, 420.0, 55.25, 199.99, 340.0, 88.50,
            ])),
            Arc::new(StringArray::from(vec![
                "New York",
                "Los Angeles",
                "Chicago",
                "Houston",
                "Phoenix",
                "New York",
                "Chicago",
                "Los Angeles",
                "Houston",
                "Phoenix",
            ])),
        ],
    )?;

    ctx.register_batch("demo", batch)?;
    println!("Registered in-memory 'demo' table (10 rows)");

    Ok(ctx)
}

#[cfg(test)]
mod tests {
    use super::*;
    use futures::TryStreamExt;

    #[tokio::test]
    async fn context_has_demo_table() {
        let ctx = create_context().await.unwrap();
        let df = ctx.sql("SELECT * FROM demo").await.unwrap();
        let batches = df.collect().await.unwrap();

        let total_rows: usize = batches.iter().map(|b| b.num_rows()).sum();
        assert_eq!(total_rows, 10);
    }

    #[tokio::test]
    async fn query_with_filter() {
        let ctx = create_context().await.unwrap();
        let df = ctx
            .sql("SELECT id, name FROM demo WHERE id > 5")
            .await
            .unwrap();
        let batches = df.collect().await.unwrap();

        let total_rows: usize = batches.iter().map(|b| b.num_rows()).sum();
        assert_eq!(total_rows, 5);
    }

    #[tokio::test]
    async fn query_streaming() {
        let ctx = create_context().await.unwrap();
        let df = ctx.sql("SELECT * FROM demo").await.unwrap();
        let mut stream = df.execute_stream().await.unwrap();

        let mut total_rows = 0usize;
        while let Some(batch) = stream.try_next().await.unwrap() {
            total_rows += batch.num_rows();
        }
        assert_eq!(total_rows, 10);
    }
}
