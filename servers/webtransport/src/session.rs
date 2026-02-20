use std::sync::Arc;
use std::time::Duration;

use anyhow::Result;
use futures::TryStreamExt;
use server_core::datafusion::prelude::SessionContext;
use server_core::encode::StreamEncoder;
use wtransport::Connection;

pub async fn handle_session(
    incoming_session: wtransport::endpoint::IncomingSession,
    ctx: Arc<SessionContext>,
) -> Result<()> {
    let session_request = incoming_session.await?;
    println!(
        "New session request from: {:?}",
        session_request.authority()
    );

    let connection = session_request.accept().await?;
    println!("Connection established");

    match connection.accept_bi().await {
        Ok((mut send, mut recv)) => {
            println!("Accepted bidirectional stream");

            let mut query_bytes = Vec::new();
            let mut buffer = vec![0u8; 4096];
            while let Some(n) = recv.read(&mut buffer).await? {
                query_bytes.extend_from_slice(&buffer[..n]);
            }

            let query = String::from_utf8(query_bytes)?;
            println!("Received query: {}", query);

            let df = match ctx.sql(&query).await {
                Ok(df) => df,
                Err(e) => {
                    let msg = format!("Query error: {e}");
                    eprintln!("{msg}");
                    send.write_all(msg.as_bytes()).await?;
                    return Ok(());
                }
            };

            let mut stream = match df.execute_stream().await {
                Ok(s) => s,
                Err(e) => {
                    let msg = format!("Execution error: {e}");
                    eprintln!("{msg}");
                    send.write_all(msg.as_bytes()).await?;
                    return Ok(());
                }
            };

            let schema = stream.schema();

            let mut encoder = StreamEncoder::try_new(&schema)?;
            let header = encoder.drain();
            send.write_all(&header).await?;
            println!("Sent IPC schema header ({} bytes)", header.len());

            let mut batch_count = 0usize;
            let mut total_rows = 0usize;
            let mut total_bytes = header.len();
            let mut cancelled = false;

            loop {
                tokio::select! {
                    batch_result = stream.try_next() => {
                        match batch_result? {
                            Some(batch) => {
                                let rows = batch.num_rows();
                                encoder.write_batch(&batch)?;
                                let chunk = encoder.drain();
                                send.write_all(&chunk).await?;

                                batch_count += 1;
                                total_rows += rows;
                                total_bytes += chunk.len();
                                println!(
                                    "Sent batch {} ({} rows, {} bytes)",
                                    batch_count, rows, chunk.len()
                                );

                                send_progress(&connection, total_rows, batch_count, total_bytes);
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

            encoder.finish()?;
            let footer = encoder.drain();
            send.write_all(&footer).await?;
            send.finish().await?;

            if cancelled {
                println!(
                    "Query cancelled after {} batches, {} total rows",
                    batch_count, total_rows
                );
            } else {
                println!(
                    "Query complete: {} batches, {} total rows",
                    batch_count, total_rows
                );
            }
        }
        Err(e) => eprintln!("Error accepting stream: {}", e),
    }

    let _ = tokio::time::timeout(Duration::from_secs(5), connection.closed()).await;

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
