use std::net::SocketAddr;
use std::sync::Arc;

use axum::extract::State;
use axum::http::{HeaderValue, Method, header};
use axum::response::IntoResponse;
use axum::routing::post;
use axum::{Json, Router};
use serde::Deserialize;
use server_core::datafusion::prelude::SessionContext;
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

    match execute_json(&state.ctx, &req.sql).await {
        Ok(json_bytes) => {
            ([(header::CONTENT_TYPE, "application/json")], json_bytes).into_response()
        }
        Err(e) => {
            let msg = format!("Query error: {e}");
            eprintln!("{msg}");
            (
                axum::http::StatusCode::BAD_REQUEST,
                [(header::CONTENT_TYPE, "text/plain")],
                msg,
            )
                .into_response()
        }
    }
}

async fn execute_json(ctx: &SessionContext, sql: &str) -> anyhow::Result<Vec<u8>> {
    let df = ctx.sql(sql).await?;
    let batches = df.collect().await?;

    let total_rows: usize = batches.iter().map(|b| b.num_rows()).sum();
    println!(
        "Query returned {} batches, {} total rows",
        batches.len(),
        total_rows
    );

    let mut buf = Vec::new();
    let mut writer = arrow_json::ArrayWriter::new(&mut buf);
    for batch in &batches {
        writer.write(batch)?;
    }
    writer.finish()?;

    Ok(buf)
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

    let addr: SocketAddr = "127.0.0.1:3001".parse().unwrap();
    let (cert_path, key_path) = server_core::certs::ensure_certs()?;
    let tls_config =
        axum_server::tls_rustls::RustlsConfig::from_pem_file(cert_path, key_path).await?;

    println!("HTTP/2 JSON server listening on https://{addr} (POST /query)");
    axum_server::bind_rustls(addr, tls_config)
        .serve(app.into_make_service())
        .await?;
    Ok(())
}
