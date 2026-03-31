use std::sync::Arc;
use std::time::{Duration, Instant};

use anyhow::{Context, Result};
use futures::TryStreamExt;
use server_core::datafusion::physical_plan::SendableRecordBatchStream;
use server_core::datafusion::prelude::SessionContext;
use server_core::encode::StreamEncoder;
use tokio_util::sync::CancellationToken;
use wtransport::Connection;

const PROGRESS_INTERVAL: Duration = Duration::from_millis(100);

pub async fn handle_session(
    incoming_session: wtransport::endpoint::IncomingSession,
    ctx: Arc<SessionContext>,
) -> Result<()> {
    let connection = accept_connection(incoming_session).await?;
    let (mut send, recv) = connection.accept_bi().await?;

    let query = read_query(recv).await?;
    println!("Received query: {query}");

    let record_stream = match execute_query(&ctx, &query).await {
        Ok(s) => s,
        Err(e) => {
            let msg = format!("Query error: {e}");
            eprintln!("{msg}");
            send.write_all(msg.as_bytes()).await?;
            return Ok(());
        }
    };

    let cancel_token = CancellationToken::new();
    spawn_datagram_listener(connection.clone(), cancel_token.clone());

    let cancelled = stream_results(&connection, &mut send, record_stream, &cancel_token).await?;

    if !cancelled {
        send.finish().await?;
    }

    let _ = tokio::time::timeout(Duration::from_secs(5), connection.closed()).await;
    Ok(())
}

fn spawn_datagram_listener(connection: Connection, cancel_token: CancellationToken) {
    tokio::spawn(async move {
        loop {
            match connection.receive_datagram().await {
                Ok(dg) => {
                    if is_cancel_payload(&dg.payload()) {
                        println!("Cancel requested by client");
                        let _ = connection.send_datagram(b"{\"type\":\"cancel_ack\"}");
                        cancel_token.cancel();
                        return;
                    }
                }
                Err(_) => return,
            }
        }
    });
}

async fn accept_connection(incoming: wtransport::endpoint::IncomingSession) -> Result<Connection> {
    let request = incoming.await?;
    println!("New session request from: {:?}", request.authority());
    let connection = request.accept().await?;
    println!("Connection established");
    Ok(connection)
}

async fn read_query(mut recv: wtransport::RecvStream) -> Result<String> {
    let mut query_bytes = Vec::new();
    let mut buffer = vec![0u8; 4096];
    while let Some(n) = recv.read(&mut buffer).await? {
        query_bytes.extend_from_slice(&buffer[..n]);
    }
    Ok(String::from_utf8(query_bytes)?)
}

async fn execute_query(ctx: &SessionContext, query: &str) -> Result<SendableRecordBatchStream> {
    let df = ctx.sql(query).await.context("query planning failed")?;
    let stream = df
        .execute_stream()
        .await
        .context("query execution failed")?;
    Ok(stream)
}

/// Stream Arrow IPC encoded batches over the WebTransport send stream.
///
/// Returns `true` if the query was cancelled by the client.
async fn stream_results(
    connection: &Connection,
    send: &mut wtransport::SendStream,
    mut record_stream: SendableRecordBatchStream,
    cancel_token: &CancellationToken,
) -> Result<bool> {
    let schema = record_stream.schema();
    let mut encoder = StreamEncoder::try_new(&schema)?;

    let header = encoder.drain();
    send.write_all(&header).await?;

    let mut batch_count = 0usize;
    let mut total_rows = 0usize;
    let mut total_bytes = header.len();
    let mut cancelled = false;
    let mut last_progress = Instant::now();

    while let Some(batch) = record_stream.try_next().await.transpose() {
        let batch = batch?;
        let rows = batch.num_rows();

        encoder.write_batch(&batch)?;
        let chunk = encoder.drain();
        let chunk_len = chunk.len();

        tokio::select! {
            result = send.write_all(&chunk) => result?,
            _ = cancel_token.cancelled() => {
                cancelled = true;
                break;
            }
        }

        batch_count += 1;
        total_rows += rows;
        total_bytes += chunk_len;

        if last_progress.elapsed() >= PROGRESS_INTERVAL {
            send_progress(connection, total_rows, batch_count, total_bytes);
            last_progress = Instant::now();
        }
    }

    if !cancelled {
        encoder.finish()?;
        let footer = encoder.drain();
        send.write_all(&footer).await?;
        total_bytes += footer.len();
    }

    if batch_count > 0 {
        send_progress(connection, total_rows, batch_count, total_bytes);
    }

    if cancelled {
        println!("Query cancelled after {batch_count} batches, {total_rows} total rows");
    } else {
        println!(
            "Query complete: {batch_count} batches, {total_rows} total rows, {total_bytes} bytes"
        );
    }

    Ok(cancelled)
}

fn send_progress(connection: &Connection, rows: usize, batches: usize, bytes: usize) {
    let msg = serde_json::json!({
        "type": "progress",
        "rows": rows,
        "batches": batches,
        "bytes": bytes
    });
    let _ = connection.send_datagram(msg.to_string().as_bytes());
}

fn is_cancel_payload(payload: &[u8]) -> bool {
    let Ok(msg) = serde_json::from_slice::<serde_json::Value>(payload) else {
        return false;
    };
    msg.get("type").and_then(|v| v.as_str()) == Some("cancel")
}
