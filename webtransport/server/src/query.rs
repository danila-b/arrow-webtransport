use anyhow::Result;
use datafusion::prelude::ParquetReadOptions;
use datafusion::prelude::{SessionConfig, SessionContext};
use std::path::PathBuf;

const TAXI_TABLE_NAME: &str = "yellow_taxi";

fn taxi_dataset_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("..")
        .join("data")
        .join("nyc_yellow_taxi_dataset")
}

fn parquet_glob_path() -> Result<String> {
    let dataset_dir = taxi_dataset_dir();
    let mut parquet_files = std::fs::read_dir(&dataset_dir)?
        .filter_map(|entry| entry.ok().map(|e| e.path()))
        .filter(|path| {
            path.file_name()
                .and_then(|name| name.to_str())
                .is_some_and(|name| {
                    name.starts_with("yellow_tripdata_") && name.ends_with(".parquet")
                })
        })
        .collect::<Vec<_>>();

    parquet_files.sort();

    anyhow::ensure!(
        !parquet_files.is_empty(),
        "No yellow taxi parquet files found in {}",
        dataset_dir.display()
    );

    Ok(dataset_dir
        .join("yellow_tripdata_*.parquet")
        .to_string_lossy()
        .into_owned())
}

/// Create a DataFusion `SessionContext` with the yellow taxi dataset registered.
///
/// Registers all monthly parquet files in `data/nyc_yellow_taxi_dataset` as `yellow_taxi`.
pub async fn create_context() -> Result<SessionContext> {
    let mut config = SessionConfig::new();
    // Client JS Arrow library doesn't support View types, so we disable them for now to ensure compatibility.
    config
        .options_mut()
        .execution
        .parquet
        .schema_force_view_types = false;

    let ctx = SessionContext::new_with_config(config);

    let parquet_glob = parquet_glob_path()?;
    ctx.register_parquet(
        TAXI_TABLE_NAME,
        &parquet_glob,
        ParquetReadOptions::default(),
    )
    .await?;
    println!(
        "Registered table '{}' from {}",
        TAXI_TABLE_NAME, parquet_glob
    );

    Ok(ctx)
}

#[cfg(test)]
mod tests {
    use super::*;
    use futures::TryStreamExt;

    async fn build_context_or_skip() -> Option<SessionContext> {
        match create_context().await {
            Ok(ctx) => Some(ctx),
            Err(err) => {
                eprintln!("Skipping test: {}", err);
                None
            }
        }
    }

    #[tokio::test]
    async fn context_has_yellow_taxi_table() {
        let Some(ctx) = build_context_or_skip().await else {
            return;
        };
        let df = ctx
            .sql(&format!("SELECT * FROM {} LIMIT 1000", TAXI_TABLE_NAME))
            .await
            .unwrap();
        let batches = df.collect().await.unwrap();

        let total_rows: usize = batches.iter().map(|b| b.num_rows()).sum();
        assert!(total_rows > 0);
        assert!(total_rows <= 1000);
    }

    #[tokio::test]
    async fn query_with_filter() {
        let Some(ctx) = build_context_or_skip().await else {
            return;
        };
        let df = ctx
            .sql(&format!(
                "SELECT passenger_count FROM {} WHERE passenger_count > 1 LIMIT 100",
                TAXI_TABLE_NAME
            ))
            .await
            .unwrap();
        let batches = df.collect().await.unwrap();

        let total_rows: usize = batches.iter().map(|b| b.num_rows()).sum();
        assert!(total_rows <= 100);
    }

    #[tokio::test]
    async fn query_streaming() {
        let Some(ctx) = build_context_or_skip().await else {
            return;
        };
        let df = ctx
            .sql(&format!("SELECT * FROM {} LIMIT 1000", TAXI_TABLE_NAME))
            .await
            .unwrap();
        let mut stream = df.execute_stream().await.unwrap();

        let mut total_rows = 0usize;
        while let Some(batch) = stream.try_next().await.unwrap() {
            total_rows += batch.num_rows();
        }
        assert!(total_rows > 0);
        assert!(total_rows <= 1000);
    }
}
