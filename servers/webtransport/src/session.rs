use std::sync::Arc;
use std::time::Duration;

use anyhow::{Context, Result};
use futures::TryStreamExt;
use server_core::datafusion::physical_plan::SendableRecordBatchStream;
use server_core::datafusion::prelude::SessionContext;
use server_core::encode::StreamEncoder;
use wtransport::Connection;

struct EncodedChunk {
    data: Vec<u8>,
    rows: usize,
}

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

    stream_results(&connection, &mut send, record_stream).await?;
    send.finish().await?;

    let _ = tokio::time::timeout(Duration::from_secs(5), connection.closed()).await;
    Ok(())
}

async fn accept_connection(
    incoming: wtransport::endpoint::IncomingSession,
) -> Result<Connection> {
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

async fn execute_query(
    ctx: &SessionContext,
    query: &str,
) -> Result<SendableRecordBatchStream> {
    let df = ctx.sql(query).await.context("query planning failed")?;
    let stream = df.execute_stream().await.context("query execution failed")?;
    Ok(stream)
}

async fn stream_results(
    connection: &Connection,
    send: &mut wtransport::SendStream,
    mut record_stream: SendableRecordBatchStream,
) -> Result<()> {
    let schema = record_stream.schema();
    let mut encoder = StreamEncoder::try_new(&schema)?;
    let header = encoder.drain();

    let (tx, mut rx) = tokio::sync::mpsc::channel::<EncodedChunk>(16);

    tx.send(EncodedChunk {
        data: header,
        rows: 0,
    })
    .await
    .map_err(|_| anyhow::anyhow!("channel closed"))?;

    tokio::spawn(async move {
        while let Some(batch) = record_stream.try_next().await.transpose() {
            match batch {
                Ok(batch) => {
                    let rows = batch.num_rows();
                    if let Err(e) = encoder.write_batch(&batch) {
                        eprintln!("Encode error: {e}");
                        break;
                    }
                    let chunk = encoder.drain();
                    if tx.send(EncodedChunk { data: chunk, rows }).await.is_err() {
                        return;
                    }
                }
                Err(e) => {
                    eprintln!("Stream error: {e}");
                    break;
                }
            }
        }

        if let Err(e) = encoder.finish() {
            eprintln!("Finish error: {e}");
            return;
        }
        let footer = encoder.drain();
        let _ = tx
            .send(EncodedChunk {
                data: footer,
                rows: 0,
            })
            .await;
    });

    let mut batch_count = 0usize;
    let mut total_rows = 0usize;
    let mut total_bytes = 0usize;
    let mut cancelled = false;

    loop {
        tokio::select! {
            biased;
            chunk = rx.recv() => {
                match chunk {
                    Some(first) => {
                        let mut combined = first.data;
                        let mut chunk_rows = first.rows;
                        let mut chunk_batches =
                            if first.rows > 0 { 1usize } else { 0 };

                        while let Ok(more) = rx.try_recv() {
                            combined.extend_from_slice(&more.data);
                            chunk_rows += more.rows;
                            if more.rows > 0 {
                                chunk_batches += 1;
                            }
                        }

                        send.write_all(&combined).await?;
                        total_bytes += combined.len();
                        batch_count += chunk_batches;
                        total_rows += chunk_rows;

                        if chunk_batches > 0 {
                            send_progress(
                                connection, total_rows, batch_count, total_bytes,
                            );
                        }
                    }
                    None => break,
                }
            }
            datagram_result = connection.receive_datagram() => {
                if let Ok(dg) = datagram_result {
                    let payload = dg.payload();
                    if is_cancel_payload(&payload) {
                        println!("Cancel requested by client");
                        let _ = connection.send_datagram(b"{\"type\":\"cancel_ack\"}");
                        cancelled = true;
                        break;
                    }
                }
            }
        }
    }

    if cancelled {
        println!("Query cancelled after {batch_count} batches, {total_rows} total rows");
    } else {
        println!("Query complete: {batch_count} batches, {total_rows} total rows, {total_bytes} bytes");
    }

    Ok(())
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
