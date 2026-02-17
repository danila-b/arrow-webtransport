use std::sync::Arc;

use anyhow::Result;
use datafusion::prelude::SessionContext;
use futures::TryStreamExt;

use crate::encode::StreamEncoder;

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

            // Read the full query string (loop until EOF).
            let mut query_bytes = Vec::new();
            let mut buffer = vec![0u8; 4096];
            loop {
                match recv.read(&mut buffer).await? {
                    Some(n) => query_bytes.extend_from_slice(&buffer[..n]),
                    None => break, // stream closed by client
                }
            }

            let query = String::from_utf8(query_bytes)?;
            println!("Received query: {}", query);

            // Execute via DataFusion.
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

            // Encode and send IPC schema header.
            let mut encoder = StreamEncoder::try_new(&schema)?;
            let header = encoder.drain();
            send.write_all(&header).await?;
            println!("Sent IPC schema header ({} bytes)", header.len());

            // Stream record batches incrementally.
            let mut batch_count = 0usize;
            let mut total_rows = 0usize;
            while let Some(batch) = stream.try_next().await? {
                let rows = batch.num_rows();
                encoder.write_batch(&batch)?;
                let chunk = encoder.drain();
                send.write_all(&chunk).await?;

                batch_count += 1;
                total_rows += rows;
                println!(
                    "Sent batch {} ({} rows, {} bytes)",
                    batch_count,
                    rows,
                    chunk.len()
                );
            }

            // Write EOS marker.
            encoder.finish()?;
            let footer = encoder.drain();
            send.write_all(&footer).await?;
            send.finish().await?;

            println!(
                "Query complete: {} batches, {} total rows",
                batch_count, total_rows
            );
        }
        Err(e) => eprintln!("Error accepting stream: {}", e),
    }

    Ok(())
}
