use axum::{
    extract::State,
    http::{header, HeaderMap, Method, HeaderValue},
    response::IntoResponse,
    routing::get,
    Router,
};
use bytes::Bytes;
use std::{net::SocketAddr, sync::Arc};

use arrow_array::{Int32Array, RecordBatch, StringArray};
use arrow_ipc::writer::StreamWriter;
use arrow_schema::{DataType, Field, Schema};
use tower_http::cors::CorsLayer;

#[derive(Clone)]
struct AppState {
    // Pre-encoded Arrow IPC stream bytes (for a quick demo).
    arrow_ipc: Arc<Vec<u8>>,
}

fn build_arrow_ipc_stream() -> Vec<u8> {
    let schema = Arc::new(Schema::new(vec![
        Field::new("id", DataType::Int32, false),
        Field::new("name", DataType::Utf8, false),
    ]));

    let batch = RecordBatch::try_new(
        schema.clone(),
        vec![
            Arc::new(Int32Array::from(vec![1, 2, 3])),
            Arc::new(StringArray::from(vec!["alpha", "beta", "gamma"])),
        ],
    )
    .unwrap();

    let mut out = Vec::<u8>::new();
    let mut writer = StreamWriter::try_new(&mut out, &schema).unwrap();
    writer.write(&batch).unwrap();
    writer.finish().unwrap(); // flush footer/end-of-stream
    out
}

async fn arrow_endpoint(State(st): State<AppState>) -> impl IntoResponse {
    let mut headers = HeaderMap::new();
    headers.insert(header::CONTENT_TYPE, "application/vnd.apache.arrow.stream".parse().unwrap());
    (headers, Bytes::from(st.arrow_ipc.as_ref().clone()))
}

#[tokio::main]
async fn main() {
    let state = AppState {
        arrow_ipc: Arc::new(build_arrow_ipc_stream()),
    };

    let cors = CorsLayer::new()
    .allow_origin("https://localhost:5173".parse::<HeaderValue>().unwrap())
    .allow_methods([Method::GET, Method::OPTIONS]);


    let app = Router::new()
        .route("/arrow", get(arrow_endpoint))
        .with_state(state)
        .layer(cors);
    
    // let tls_config = RustlsConfig::from_pem_file("certs/localhost.pem", "certs/localhost-key.pem")
    //     .await
    //     .unwrap(); 

    let addr: SocketAddr = "127.0.0.1:3000".parse().unwrap();
    println!("Rust backend listening on https://{addr} (GET /arrow)");
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
