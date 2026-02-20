use std::net::SocketAddr;
use std::sync::Arc;

use axum::extract::State;
use axum::http::{HeaderValue, Method, header};
use axum::response::IntoResponse;
use axum::routing::post;
use axum::{Json, Router};
use bytes::Bytes;
use futures::TryStreamExt;
use serde::Deserialize;
use server_core::datafusion::prelude::SessionContext;
use server_core::encode::StreamEncoder;
use tower_http::cors::CorsLayer;

#[derive(Clone)]
struct AppState {
    ctx: Arc<SessionContext>,
}

#[derive(Deserialize)]
struct QueryRequest {
    sql: String,
}

async fn query_endpoint(
    State(state): State<AppState>,
    Json(req): Json<QueryRequest>,
) -> impl IntoResponse {
    println!("Received query: {}", req.sql);

    let body = match execute_streaming(&state.ctx, &req.sql).await {
        Ok(body) => body,
        Err(e) => {
            let msg = format!("Query error: {e}");
            eprintln!("{msg}");
            return (
                axum::http::StatusCode::BAD_REQUEST,
                [(header::CONTENT_TYPE, "text/plain")],
                axum::body::Body::from(msg),
            )
                .into_response();
        }
    };

    (
        [(header::CONTENT_TYPE, "application/vnd.apache.arrow.stream")],
        body,
    )
        .into_response()
}

async fn execute_streaming(ctx: &SessionContext, sql: &str) -> anyhow::Result<axum::body::Body> {
    let df = ctx.sql(sql).await?;
    let mut stream = df.execute_stream().await?;
    let schema = stream.schema();

    let (tx, rx) = tokio::sync::mpsc::channel::<Result<Bytes, std::io::Error>>(16);

    let mut encoder = StreamEncoder::try_new(&schema)?;
    let header = encoder.drain();
    let header_len = header.len();
    tx.send(Ok(Bytes::from(header)))
        .await
        .map_err(|_| anyhow::anyhow!("channel closed"))?;
    println!("Sent IPC schema header ({} bytes)", header_len);

    tokio::spawn(async move {
        let mut batch_count = 0usize;
        let mut total_rows = 0usize;

        while let Some(batch) = stream.try_next().await.transpose() {
            match batch {
                Ok(batch) => {
                    let rows = batch.num_rows();
                    if let Err(e) = encoder.write_batch(&batch) {
                        eprintln!("Encode error: {e}");
                        break;
                    }
                    let chunk = encoder.drain();
                    batch_count += 1;
                    total_rows += rows;
                    println!(
                        "Sent batch {} ({} rows, {} bytes)",
                        batch_count,
                        rows,
                        chunk.len()
                    );
                    if tx.send(Ok(Bytes::from(chunk))).await.is_err() {
                        println!("Client disconnected, cancelling query");
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
        let _ = tx.send(Ok(Bytes::from(footer))).await;
        println!(
            "Query complete: {} batches, {} total rows",
            batch_count, total_rows
        );
    });

    let recv_stream = tokio_stream::wrappers::ReceiverStream::new(rx);
    Ok(axum::body::Body::from_stream(recv_stream))
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let ctx = Arc::new(server_core::query::create_context().await?);

    let cors = CorsLayer::new()
        .allow_origin("https://localhost:5173".parse::<HeaderValue>().unwrap())
        .allow_methods([Method::POST, Method::OPTIONS])
        .allow_headers([header::CONTENT_TYPE]);

    let state = AppState { ctx };

    let app = Router::new()
        .route("/query", post(query_endpoint))
        .with_state(state)
        .layer(cors);

    let addr: SocketAddr = "127.0.0.1:3000".parse().unwrap();
    println!("HTTP/2 Arrow server listening on http://{addr} (POST /query)");
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}
